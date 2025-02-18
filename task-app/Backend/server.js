require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const fs = require('fs');

const app = express();
const port = 3000;

const serviceAccount = JSON.parse(fs.readFileSync('./credenciales/task-manager-79c82-firebase-adminsdk-fbsvc-3771274df0.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

app.use(express.json());

// Endpoint para registrar usuario
app.post('/register', async (req, res) => {
    const { username, password, email, birthDate, fullName } = req.body;

    if (!username || !password || !email || !birthDate || !fullName) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Todos los campos son obligatorios' });
    }

    try {
        // Verificar si el usuario ya existe
        const usersRef = db.collection('usuarios');
        const existingUser = await usersRef.where('username', '==', username).get();
        const existingEmail = await usersRef.where('email', '==', email).get();

        if (!existingUser.empty || !existingEmail.empty) {
            return res.status(409).json({ statusCode: 409, intMessage: 'El username o email ya están en uso' });
        }

        // Guardar usuario en Firestore
        await usersRef.add({ username, password, email, birthDate, fullName });

        return res.status(201).json({ statusCode: 201, intMessage: 'Usuario registrado con éxito', data: { username, email } });

    } catch (err) {
        console.error('Error registrando usuario:', err);
        return res.status(500).json({ statusCode: 500, intMessage: 'Internal Server Error' });
    }
});

// Endpoint para validar usuario
app.get('/validate', async (req, res) => {
    const { username, password } = req.headers;

    if (!username || !password) {
        return res.status(400).json({ statusCode: 400, intMessage: 'Se requieren username y password' });
    }

    try {
        const usersRef = db.collection('usuarios');
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
            data: { message: 'Autenticación exitosa', user: { username: user.username, email: user.email } }
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
