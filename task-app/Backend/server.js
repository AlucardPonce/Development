require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require("cors"); 
const app = express();
const port = 3000;
const bodyParser = require('body-parser');

const serviceAccount = JSON.parse(fs.readFileSync('./credenciales/firebase-key.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


admin.firestore().collection('users').limit(1).get()
    .then(() => {
        console.log('Conexión a Firebase establecida correctamente');
    })
    .catch((err) => {
        console.error('Error al conectar con Firebase:', err);
    });

const db = admin.firestore();

app.use(cors()); 
app.use(express.json());

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
};

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(403).json({ statusCode: 403, message: 'Token no proporcionado' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('Error al verificar el token:', err);
            if (err.name === 'TokenExpiredError') {
                return res.status(440).json({ statusCode: 440, message: 'Token expirado, inicie sesión nuevamente' });
            }
            return res.status(401).json({ statusCode: 401, message: 'Token no válido' });
        }

        req.username = decoded.userId || decoded.username;
        next();
    });
};


app.post('/register', async (req, res) => {
    const { username, password, gmail, rol } = req.body;
    const last_login = new Date().toISOString(); 

    if (!username || !password || !gmail || !rol) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Todos los campos son obligatorios' });
    }

    try {
        const usersRef = db.collection('USERS');
        const existingUser = await usersRef.where('username', '==', username).get();
        const existingGmail = await usersRef.where('gmail', '==', gmail).get();

        if (!existingUser.empty || !existingGmail.empty) {
            return res.status(409).json({ statusCode: 409, intMessage: 'El username o gmail ya están en uso' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userRef = usersRef.doc(); // Crear un nuevo documento con un ID único

        await userRef.set({
            username,
            password: hashedPassword,
            gmail,
            last_login,
            rol,
            id: userRef.id 
        });

        return res.status(201).json({ statusCode: 201, intMessage: 'Usuario registrado con éxito', data: { username, gmail, id: userRef.id } });

    } catch (err) {
        console.error('Error registrando usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Internal Server Error' });
    }
});


app.post('/validate', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Se requieren username y password' });
    }

    try {
        const usersRef = db.collection('USERS');
        const querySnapshot = await usersRef.where('username', '==', username).get();

        if (querySnapshot.empty) {
            return res.status(401).json({ statusCode: 401, intMessage: 'Credenciales incorrectas' });
        }

        const user = querySnapshot.docs[0].data();
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ statusCode: 401, intMessage: 'Credenciales incorrectas' });
        }

        const token = generateToken(user.username);

        return res.status(200).json({
            statusCode: 200,
            intMessage: 'Operación exitosa',
            data: {
                message: 'Autenticación exitosa',
                user: { username: user.username, gmail: user.gmail },
                token
            }
        });

    } catch (err) {
        console.error('Error al validar usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});

//$$$$$$$$$$$$$$$$$$$$$$$$$$$$$[      APIS TASK         ]$$$$$$$$$$$$$$$$$$$$$$$$$$$$
app.post('/tasks', verifyToken, async (req, res) => {
    try {
        const { category, description, name_task, status, time_until_finish, remind_me } = req.body;

        if (!category || !description || !name_task || !status || !time_until_finish || !remind_me) {
            return res.status(400).json({ statusCode: 400, message: 'Todos los campos son obligatorios' });
        }

        const timestamp = new Date().toISOString();
        const taskRef = db.collection('task').doc(); 
        const newTask = { 
            id: taskRef.id,
            category, 
            description, 
            name_task, 
            status, 
            time_until_finish, 
            remind_me, 
            timestamp,
            username: req.username 
        }; 

        await taskRef.set(newTask);
        res.status(201).json({ statusCode: 201, message: 'Tarea creada con éxito', taskId: taskRef.id });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al crear la tarea', error: err.message });
    }
});

app.get('/tasks', verifyToken, async (req, res) => {
    try {
        const username = req.username; 

        const tasksSnapshot = await db.collection('task').where('username', '==', username).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ statusCode: 200, tasks });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener tareas', error: err.message });
    }
});

app.get('/all-tasks', async (req, res) => {
    try {
        const tasksSnapshot = await db.collection('task').get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ statusCode: 200, tasks });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener todas las tareas', error: err.message });
    }
});

app.put('/tasks/update/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { category, description, name_task, status, time_until_finish, remind_me } = req.body;

        if (!category || !description || !name_task || !status || !time_until_finish || !remind_me) {
            return res.status(400).json({ statusCode: 400, message: 'Todos los campos son obligatorios' });
        }

        const taskRef = db.collection('task').doc(id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Tarea no encontrada' });
        }

        // Verificar que la tarea pertenezca al usuario
        if (taskDoc.data().username !== req.username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para editar esta tarea' });
        }

        await taskRef.update({
            category,
            description,
            name_task,
            status,
            time_until_finish,
            remind_me,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({ statusCode: 200, message: 'Tarea actualizada con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al actualizar la tarea', error: err.message });
    }
});

app.delete('/tasks/delete/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const taskRef = db.collection('task').doc(id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Tarea no encontrada' });
        }

        // Verificar que la tarea pertenezca al usuario
        if (taskDoc.data().username !== req.username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para eliminar esta tarea' });
        }

        await taskRef.delete();
        res.status(200).json({ statusCode: 200, message: 'Tarea eliminada con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al eliminar la tarea', error: err.message });
    }
});

// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$   API PARA CREAR GRUPO $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$

app.post('/groups', verifyToken, async (req, res) => {
    try {
        const { name, description } = req.body;
        const username = req.username;

        if (!name || !description) {
            return res.status(400).json({ statusCode: 400, message: 'Nombre y descripción son obligatorios' });
        }

        // Verificar si el usuario tiene permiso para crear grupos (por ejemplo, si es admin)
        const userRef = db.collection('USERS').where('username', '==', username).get();
        const user = (await userRef).docs[0].data();

        if (user.rol !== 'admin') {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para crear grupos' });
        }

        const groupRef = db.collection('group').doc();
        const newGroup = {
            id: groupRef.id,
            name,
            description,
            created_by: username,
            created_at: new Date().toISOString(),
            members: [username] // El creador es automáticamente miembro del grupo
        };

        await groupRef.set(newGroup);
        res.status(201).json({ statusCode: 201, message: 'Grupo creado con éxito', groupId: groupRef.id });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al crear el grupo', error: err.message });
    }
});

app.post('/groups/:groupId/add-member', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { usernameToAdd } = req.body;
        const username = req.username;

        const groupRef = db.collection('group').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        // Verificar si el usuario que hace la solicitud es el creador del grupo
        if (group.created_by !== username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para añadir miembros' });
        }

        // Verificar si el usuario a añadir existe
        const userRef = db.collection('USERS').where('username', '==', usernameToAdd).get();
        const user = (await userRef).docs[0];

        if (!user) {
            return res.status(404).json({ statusCode: 404, message: 'Usuario no encontrado' });
        }

        // Añadir el usuario al grupo
        await groupRef.update({
            members: admin.firestore.FieldValue.arrayUnion(usernameToAdd)
        });

        res.status(200).json({ statusCode: 200, message: 'Usuario añadido al grupo con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al añadir usuario al grupo', error: err.message });
    }
});

app.post('/groups/:groupId/tasks', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { category, description, name_task, status, time_until_finish, remind_me, assignedTo } = req.body;
        const username = req.username;

        if (!category || !description || !name_task || !status || !time_until_finish || !remind_me || !assignedTo) {
            return res.status(400).json({ statusCode: 400, message: 'Todos los campos son obligatorios' });
        }

        const groupRef = db.collection('group').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        // Verificar si el usuario que hace la solicitud es el creador del grupo
        if (group.created_by !== username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para crear tareas en este grupo' });
        }

        // Verificar si el usuario asignado es miembro del grupo
        if (!group.members.includes(assignedTo)) {
            return res.status(400).json({ statusCode: 400, message: 'El usuario asignado no es miembro del grupo' });
        }

        const taskRef = db.collection('task').doc();
        const newTask = {
            id: taskRef.id,
            category,
            description,
            name_task,
            status,
            time_until_finish,
            remind_me,
            assignedTo,
            groupId,
            created_by: username,
            created_at: new Date().toISOString()
        };

        await taskRef.set(newTask);
        res.status(201).json({ statusCode: 201, message: 'Tarea creada con éxito', taskId: taskRef.id });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al crear la tarea', error: err.message });
    }
});

app.get('/groups/:groupId/tasks', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.username;

        const groupRef = db.collection('group').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        // Verificar si el usuario es miembro del grupo
        if (!group.members.includes(username)) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para ver las tareas de este grupo' });
        }

        const tasksSnapshot = await db.collection('task').where('groupId', '==', groupId).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, tasks });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener las tareas del grupo', error: err.message });
    }
});

app.put('/tasks/:taskId/update-status', verifyToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        const username = req.username;

        if (!status) {
            return res.status(400).json({ statusCode: 400, message: 'El estado es obligatorio' });
        }

        const taskRef = db.collection('task').doc(taskId);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Tarea no encontrada' });
        }

        const task = taskDoc.data();

        // Verificar si el usuario es el asignado a la tarea
        if (task.assignedTo !== username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para actualizar esta tarea' });
        }

        await taskRef.update({ status });

        res.status(200).json({ statusCode: 200, message: 'Estado de la tarea actualizado con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al actualizar el estado de la tarea', error: err.message });
    }
});

app.delete('/tasks/:taskId/delete', verifyToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const username = req.username;

        const taskRef = db.collection('task').doc(taskId);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Tarea no encontrada' });
        }

        const task = taskDoc.data();

        // Verificar si el usuario es el creador del grupo
        const groupRef = db.collection('group').doc(task.groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        if (group.created_by !== username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para eliminar esta tarea' });
        }

        await taskRef.delete();
        res.status(200).json({ statusCode: 200, message: 'Tarea eliminada con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al eliminar la tarea', error: err.message });
    }
});

app.get('/user/groups', verifyToken, async (req, res) => {
    try {
        const username = req.username;

        const groupsSnapshot = await db.collection('group').where('members', 'array-contains', username).get();
        const groups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, groups });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener los grupos del usuario', error: err.message });
    }
});

app.delete('/groups/:groupId/delete', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.username;

        const groupRef = db.collection('group').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        // Verificar si el usuario es el creador del grupo
        if (group.created_by !== username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para eliminar este grupo' });
        }

        await groupRef.delete();
        res.status(200).json({ statusCode: 200, message: 'Grupo eliminado con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al eliminar el grupo', error: err.message });
    }
});

app.get('/user/tasks', verifyToken, async (req, res) => {
    try {
        const username = req.username;

        const tasksSnapshot = await db.collection('task').where('assignedTo', '==', username).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, tasks });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener las tareas del usuario', error: err.message });
    }
});

app.get('/users', verifyToken, async (req, res) => {
    try {
        const username = req.username;

        // Verificar si el usuario es admin
        const userRef = db.collection('USERS').where('username', '==', username).get();
        const user = (await userRef).docs[0].data();

        if (user.rol !== 'admin') {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para ver todos los usuarios' });
        }

        const usersSnapshot = await db.collection('USERS').get();
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, users });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener los usuarios', error: err.message });
    }
});

app.delete('/users/:userId/delete', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const username = req.username;

        // Verificar si el usuario es admin
        const userRef = db.collection('USERS').where('username', '==', username).get();
        const user = (await userRef).docs[0].data();

        if (user.rol !== 'admin') {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para eliminar usuarios' });
        }

        const userToDeleteRef = db.collection('USERS').doc(userId);
        const userToDeleteDoc = await userToDeleteRef.get();

        if (!userToDeleteDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Usuario no encontrado' });
        }

        await userToDeleteRef.delete();
        res.status(200).json({ statusCode: 200, message: 'Usuario eliminado con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al eliminar el usuario', error: err.message });
    }
});

app.put('/users/:userId/update-rol', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { rol } = req.body;
        const username = req.username;

        // Verificar si el usuario es admin
        const userRef = db.collection('USERS').where('username', '==', username).get();
        const user = (await userRef).docs[0].data();

        if (user.rol !== 'admin') {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para actualizar roles' });
        }

        const userToUpdateRef = db.collection('USERS').doc(userId);
        const userToUpdateDoc = await userToUpdateRef.get();

        if (!userToUpdateDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Usuario no encontrado' });
        }

        await userToUpdateRef.update({ rol });
        res.status(200).json({ statusCode: 200, message: 'Rol del usuario actualizado con éxito' });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al actualizar el rol del usuario', error: err.message });
    }
});

app.get('/user/rol', verifyToken, async (req, res) => {
    try {
        const username = req.username;

        const userRef = db.collection('USERS').where('username', '==', username).get();
        const user = (await userRef).docs[0].data();

        res.status(200).json({ statusCode: 200, rol: user.rol });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener el rol del usuario', error: err.message });
    }
});

app.get('/user/tasks-history', verifyToken, async (req, res) => {
    try {
        const username = req.username;

        const tasksSnapshot = await db.collection('task').where('assignedTo', '==', username).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, tasks });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener el historial de tareas del usuario', error: err.message });
    }
});

app.get('/groups/:groupId/tasks-history', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.username;

        const groupRef = db.collection('group').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        // Verificar si el usuario es miembro del grupo
        if (!group.members.includes(username)) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para ver el historial de tareas de este grupo' });
        }

        const tasksSnapshot = await db.collection('task').where('groupId', '==', groupId).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, tasks });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener el historial de tareas del grupo', error: err.message });
    }
});

app.get('/groups/:groupId/user/tasks-history', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.username;

        const groupRef = db.collection('group').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        // Verificar si el usuario es miembro del grupo
        if (!group.members.includes(username)) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para ver el historial de tareas de este grupo' });
        }

        const tasksSnapshot = await db.collection('task').where('groupId', '==', groupId).where('assignedTo', '==', username).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, tasks });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener el historial de tareas del usuario en el grupo', error: err.message });
    }
});

app.get('/groups/:groupId/all-users/tasks-history', verifyToken, async (req, res) => {
    try {
        const { groupId } = req.params;
        const username = req.username;

        const groupRef = db.collection('group').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Grupo no encontrado' });
        }

        const group = groupDoc.data();

        // Verificar si el usuario es el creador del grupo
        if (group.created_by !== username) {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para ver el historial de tareas de todos los usuarios en este grupo' });
        }

        const tasksSnapshot = await db.collection('task').where('groupId', '==', groupId).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        res.status(200).json({ statusCode: 200, tasks });

    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener el historial de tareas de todos los usuarios en el grupo', error: err.message });
    }
});


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
