require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');
const validator = require('validator'); // Importamos validator

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

app.use(express.json());

// Endpoint para registrar usuario
app.post('/register', async (req, res) => {
    const { username, password, gmail, last_login, rol } = req.body;

    const errors = [];

    // Validación de campos vacíos
    if (!username || !password || !gmail || !last_login || !rol) {
        errors.push('Todos los campos son obligatorios');
    }

    // Validación del formato del email
    if (gmail && !validator.isEmail(gmail)) {
        errors.push('El formato de email no es válido');
    }

    // Validación de la longitud de la contraseña
    if (password && password.length < 6) {
        errors.push('La contraseña debe tener al menos 6 caracteres');
    }

    // Si hay errores, devolverlos
    if (errors.length > 0) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Errores de validación', errors });
    }

    try {
        // Verificar si el usuario ya existe
        const usersRef = db.collection('USERS');
        const existingUser = await usersRef.where('username', '==', username).get();
        const existingGmail = await usersRef.where('gmail', '==', gmail).get();

        if (!existingUser.empty || !existingGmail.empty) {
            return res.status(409).json({ statusCode: 409, intMessage: 'El username o gmail ya están en uso' });
        }

        // Guardar usuario en Firestore
        await usersRef.add({ username, password, gmail, last_login, rol });

        return res.status(201).json({ statusCode: 201, intMessage: 'Usuario registrado con éxito', data: { username, gmail } });

    } catch (err) {
        console.error('Error registrando usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Internal Server Error' });
    }
});

// Endpoint para validar usuario
app.post('/validate', async (req, res) => {
    const { username, password } = req.body;

    const errors = [];

    // Validación de campos vacíos
    if (!username || !password) {
        errors.push('Se requieren username y password');
    }

    if (errors.length > 0) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Errores de validación', errors });
    }

    try {
        const usersRef = db.collection('USERS');
        const querySnapshot = await usersRef
            .where('username', '==', username)
            .where('password', '==', password)
            .get();

        if (querySnapshot.empty) {
            return res.status(401).json({ statusCode: 401, intMessage: 'Credenciales incorrectas' });
        }

        const user = querySnapshot.docs[0].data();

        return res.status(200).json({
            statusCode: 200,
            intMessage: 'Operación exitosa',
            data: { message: 'Autenticación exitosa', user: { username: user.username, gmail: user.gmail } }
        });

    } catch (err) {
        console.error('Error validando usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Internal Server Error' });
    }
});

// Servidor en escucha
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
