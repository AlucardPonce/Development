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

const serviceAccount = JSON.parse(fs.readFileSync('./credenciales/task-manager-79c82-firebase-adminsdk-fbsvc-3771274df0.json', 'utf8'));

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
        await usersRef.add({
            username,
            password: hashedPassword,
            gmail,
            last_login,
            rol
        });

        return res.status(201).json({ statusCode: 201, intMessage: 'Usuario registrado con éxito', data: { username, gmail } });

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
        const newTask = { 
            category, 
            description, 
            name_task, 
            status, 
            time_until_finish, 
            remind_me, 
            timestamp,
            username: req.username 
        }; 

        const docRef = await db.collection('task').add(newTask);
        res.status(201).json({ statusCode: 201, message: 'Tarea creada con éxito', taskId: docRef.id });
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

app.put("/tasks/edit", async (req, res) => {
    const { id, name_task, description, status } = req.body;
  
    if (!id) {
      return res.status(400).json({ message: "Se requiere el ID de la tarea" });
    }
  
    try {
      await db.collection("tasks").doc(id).update({
        name_task,
        description,
        status,
      });
  
      res.json({ message: "Tarea actualizada correctamente" });
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
      res.status(500).json({ message: "Error al actualizar tarea" });
    }
  });

  app.delete("/tasks/delete", async (req, res) => {
    const { id } = req.body;
  
    if (!id) {
      return res.status(400).json({ message: "Se requiere el ID de la tarea" });
    }
  
    try {
      await db.collection("tasks").doc(id).delete();
      res.json({ message: "Tarea eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar tarea:", error);
      res.status(500).json({ message: "Error al eliminar tarea" });
    }
  });
  
  


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
