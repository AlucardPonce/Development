require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require("cors"); 
const app = express();
const port = 3000;

const serviceAccount = JSON.parse(fs.readFileSync('./credenciales/task-manager-79c82-firebase-adminsdk-fbsvc-3771274df0.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Verificar la conexión a Firebase
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

        // Generar un token JWT
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


app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
