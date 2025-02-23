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

// $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$   API PARA CREAR GRUPO $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$
// API para crear un nuevo grupo
app.post('/groups', verifyToken, async (req, res) => {
    const { groupName } = req.body;
    try {
        const groupRef = db.collection('GROUPS').doc();
        await groupRef.set({
            id: groupRef.id,
            name: groupName,
            owner: req.username,
            members: [req.username], // Agregar el creador del grupo como miembro
            createdAt: new Date().toISOString(),
        });
        res.status(201).json({ statusCode: 201, intMessage: 'Grupo creado con éxito', groupId: groupRef.id });
    } catch (err) {
        res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});

// Obtener todos los grupos de un usuario
app.get('/groups', verifyToken, async (req, res) => {
    try {
        const groupsSnapshot = await db.collection('GROUPS').where('members', 'array-contains', req.username).get();
        const groups = groupsSnapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data, members: data.members || [] }; // Incluir los miembros
        });
        res.status(200).json({ statusCode: 200, groups });
    } catch (err) {
        res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});


// El resto de tus rutas de grupo también deberían usar verifyToken
app.post('/groups/:groupId/add-user', verifyToken, async (req, res) => {
    const { groupId } = req.params;
    const { username, role } = req.body; // Añadir el rol aquí

    try {
        const groupRef = db.collection('GROUPS').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, intMessage: 'Grupo no encontrado' });
        }

        let groupData = groupDoc.data();
        if (groupData.members.some(member => member.username === username)) {
            return res.status(400).json({ statusCode: 400, intMessage: 'El usuario ya está en el grupo' });
        }

        groupData.members.push({ username, role }); // Almacenar el usuario junto con su rol
        await groupRef.update({ members: groupData.members });

        res.status(200).json({ statusCode: 200, intMessage: 'Usuario agregado al grupo con éxito' });
    } catch (err) {
        res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});

// Crear tarea en un grupo
app.post('/groups/:groupId/tasks', verifyToken, async (req, res) => {
    const { groupId } = req.params;
    const { name_task, description, status, assignedTo } = req.body;

    try {
        const groupRef = db.collection('GROUPS').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ statusCode: 404, intMessage: 'Grupo no encontrado' });
        }

        let groupData = groupDoc.data();
        if (groupData.owner !== req.username) {
            return res.status(403).json({ statusCode: 403, intMessage: 'Solo el creador del grupo puede agregar tareas' });
        }

        if (!groupData.members.includes(assignedTo)) {
            return res.status(400).json({ statusCode: 400, intMessage: 'El usuario asignado no es miembro del grupo' });
        }

        const taskRef = db.collection('GROUP_TASKS').doc();
        await taskRef.set({
            id: taskRef.id,
            groupId,
            name_task,
            description,
            status,
            assignedTo,
            createdBy: req.username,
            timestamp: new Date().toISOString(),
        });

        res.status(201).json({ statusCode: 201, intMessage: 'Tarea creada con éxito', taskId: taskRef.id });
    } catch (err) {
        res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});

// Obtener tareas de un grupo
app.get('/groups/:groupId/tasks', verifyToken, async (req, res) => {
    const { groupId } = req.params;

    try {
        const tasksSnapshot = await db.collection('GROUP_TASKS').where('groupId', '==', groupId).get();
        const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ statusCode: 200, tasks });
    } catch (err) {
        res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});

// Actualizar solo el estado de una tarea asignada
app.put('/groups/:groupId/tasks/:taskId/status', verifyToken, async (req, res) => {
    const { groupId, taskId } = req.params;
    const { status } = req.body;

    try {
        const taskRef = db.collection('GROUP_TASKS').doc(taskId);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return res.status(404).json({ statusCode: 404, intMessage: 'Tarea no encontrada' });
        }

        let taskData = taskDoc.data();
        if (taskData.assignedTo !== req.username) {
            return res.status(403).json({ statusCode: 403, intMessage: 'Solo el usuario asignado puede actualizar el estado' });
        }

        await taskRef.update({ status });
        res.status(200).json({ statusCode: 200, intMessage: 'Estado de la tarea actualizado con éxito' });
    } catch (err) {
        res.status(500).json({ statusCode: 500, intMessage: 'Error interno del servidor', error: err.message });
    }
});


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
