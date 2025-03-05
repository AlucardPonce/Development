require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require("cors");
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

console.log("🔍 FIREBASE_SERVICE_ACCOUNT:", process.env.FIREBASE_SERVICE_ACCOUNT);


// 🔹 Verifica que la variable de entorno está definida
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("❌ ERROR: La variable de entorno FIREBASE_SERVICE_ACCOUNT no está configurada.");
    process.exit(1); // Detiene la ejecución si no hay credenciales
}

// 🔹 Convertir las credenciales de Firebase de string JSON a objeto
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// 🔹 Inicializar Firebase Admin
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase inicializado correctamente');
} catch (error) {
    console.error("❌ Error al inicializar Firebase:", error);
    process.exit(1); // Detiene la ejecución si Firebase no se inicializa
}

const db = admin.firestore();

// 🔹 Verificar conexión con Firebase
db.collection('users').limit(1).get()
    .then(() => console.log('✅ Conexión a Firebase establecida correctamente'))
    .catch((err) => console.error('❌ Error al conectar con Firebase:', err));

// 🔹 Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// 🔹 Endpoint de prueba para verificar si el backend está corriendo en Render
app.get('/status', (req, res) => {
    res.json({ message: '✅ Backend corriendo en Render', url: "https://development-iyl1.onrender.com" });
});

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
    const { username, password, gmail } = req.body; 
    const last_login = new Date().toISOString(); 

    if (!username || !password || !gmail) {
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
            rol: 'worker', // Asignamos el rol 'worker' por defecto
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
    const { id } = req.params;
    const { category, description, name_task, status, time_until_finish, remind_me, assignedTo } = req.body;
    const username = req.username; // Extraer username del objeto req

    console.log('Datos recibidos:', req.body); // Depuración: Verifica los datos recibidos
    console.log('Usuario que realiza la solicitud:', username); // Depuración: Verifica el username

    try {
        const taskRef = db.collection('task').doc(id);
        const taskDoc = await taskRef.get();

        if (!taskDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Tarea no encontrada' });
        }

        const task = taskDoc.data();

        // Verificar permisos
        const userRef = db.collection('USERS').where('username', '==', username).get();
        const userSnapshot = await userRef;

        if (userSnapshot.empty) {
            return res.status(404).json({ statusCode: 404, message: 'Usuario no encontrado' });
        }

        const user = userSnapshot.docs[0].data();

        if (task.created_by !== username && user.rol !== 'admin') {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para editar esta tarea' });
        }

        // Actualizar la tarea
        await taskRef.update({
            category,
            description,
            name_task,
            status,
            time_until_finish,
            remind_me,
            assignedTo, // Asegúrate de que este campo se actualice
            timestamp: new Date().toISOString(),
        });

        res.status(200).json({ statusCode: 200, message: 'Tarea actualizada con éxito' });
    } catch (err) {
        console.error('Error al actualizar la tarea:', err); // Depuración: Verifica el error
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

        const task = taskDoc.data();

        // Verificar si el usuario es el creador de la tarea o un admin
        const userRef = db.collection('USERS').where('username', '==', req.username).get();
        const user = (await userRef).docs[0].data();

        if (task.username !== req.username && user.rol !== 'admin') {
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
            members: [username]
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

        const userRef = db.collection('USERS').where('username', '==', username).get();
        const user = (await userRef).docs[0].data();

        if (group.created_by !== username && user.rol !== 'admin') {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para añadir miembros' });
        }

        const userToAddRef = db.collection('USERS').where('username', '==', usernameToAdd).get();
        const userToAdd = (await userToAddRef).docs[0];

        if (!userToAdd) {
            return res.status(404).json({ statusCode: 404, message: 'Usuario no encontrado' });
        }

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

        const userRef = db.collection('USERS').where('username', '==', username).get();
        const user = (await userRef).docs[0].data();

        if (user.rol !== 'admin' && user.rol !== 'managment_task') {
            return res.status(403).json({ statusCode: 403, message: 'No tienes permiso para crear tareas en este grupo' });
        }

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

app.get('/groups', verifyToken, async (req, res) => {
    try {
        const username = req.username;

        const groupsSnapshot = await db.collection('group')
            .where('members', 'array-contains', username)
            .get();

        const groups = groupsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.status(200).json({ statusCode: 200, groups });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener los grupos', error: err.message });
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

        const userRef = db.collection('USERS').where('username', '==', username).get();
        const userSnapshot = await userRef;

        if (userSnapshot.empty) {
            return res.status(404).json({ statusCode: 404, message: 'Usuario no encontrado' });
        }

        const user = userSnapshot.docs[0].data();

        if (group.created_by !== username && user.rol !== 'admin') {
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

app.put('/tasks/update1/:taskId', verifyToken, async (req, res) => {
    try {
        const taskId = req.params.taskId;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ statusCode: 400, message: 'El campo "status" es requerido' });
        }

        await db.collection('task').doc(taskId).update({ status });

        res.status(200).json({ statusCode: 200, message: 'Estado de la tarea actualizado con éxito' });
    } catch (err) {
        console.error("Error al actualizar la tarea:", err);
        res.status(500).json({ statusCode: 500, message: 'Error al actualizar la tarea', error: err.message });
    }
});

app.get('/users', verifyToken, async (req, res) => {
    try {
        const username = req.username;

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

app.get('/users/:userId/role', verifyToken, async (req, res) => {
    const { userId } = req.params;

    try {
        const userRef = db.collection('USERS').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Usuario no encontrado' });
        }

        const user = userDoc.data();

        const roleRef = db.collection('ROLES').doc(user.roleId);
        const roleDoc = await roleRef.get();

        if (!roleDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Rol no encontrado' });
        }

        const role = roleDoc.data();
        res.status(200).json({ statusCode: 200, role });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al obtener el rol del usuario', error: err.message });
    }
});

app.post('/users/:userId/assign-role', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const { roleId } = req.body;

    try {

        const roleRef = db.collection('Rol').doc(roleId);
        const roleDoc = await roleRef.get();

        if (!roleDoc.exists) {
            return res.status(404).json({ statusCode: 404, message: 'Rol no encontrado' });
        }

        const userRef = db.collection('USERS').doc(userId);
        await userRef.update({ rol: roleId });

        res.status(200).json({ statusCode: 200, message: 'Rol asignado con éxito' });
    } catch (err) {
        res.status(500).json({ statusCode: 500, message: 'Error al asignar el rol', error: err.message });
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


// 🔹 Servidor escuchando
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en: https://development-iyl1.onrender.com`);
});
