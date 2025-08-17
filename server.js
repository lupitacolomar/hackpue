// --- 1. IMPORTAR LAS "HERRAMIENTAS" ---
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config();
const multer = require('multer'); // El "recepcionista" de archivos

// --- 2. CONFIGURACIÓN INICIAL ---
const app = express();
const port = 3000;
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Configuración de Multer: guarda los archivos temporalmente en la memoria.
const upload = multer({ storage: multer.memoryStorage() });

// --- 3. "MIDDLEWARE" ---
app.use(express.json());
app.use(express.static('.')); // Permite servir archivos como ia.html

// --- 4. DEFINIR LA RUTA PARA REVISAR CIRCUITOS ---
// (Esta es la única y correcta definición de la ruta)
app.post('/revisar-circuito-jpg', upload.single('circuitoJpg'), async (req, res) => {
    try {
        // Primero, validamos que se haya subido un archivo
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ninguna imagen.' });
        }

        // Usamos el modelo más reciente y capaz para análisis de imágenes
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        // Añadimos configuración de seguridad para evitar bloqueos innecesarios
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        // Define aquí las reglas para la tarea específica. ¡Puedes cambiar esto!
        const reglasDelCircuito = `
            "Conexiones completas y sin cortos",
            "Entradas conectadas",
            "Salidas definidas",
            "Alimentación correcta",
            "Comportamiento lógico esperado",
            "Claridad en el diagrama"
        `;

        // El prompt que le da instrucciones detalladas a la IA
        const prompt = `
            Eres un asistente especializado en análisis de circuitos eléctricos y electrónicos.
        Tu tarea es:
        1. Recibir la descripción o imagen de un circuito.
        2. Evaluar si el circuito cumple con principios básicos de funcionamiento (ley de Ohm, Kirchhoff, conexiones lógicas, etc.).
        3. Dar retroalimentación clara de los errores o aciertos.
        4. Determinar un porcentaje aproximado de qué tan correcto está el circuito (ejemplo: 70% correcto, 30% incorrecto).
        5. Explicar qué partes están bien y qué partes necesitan corregirse.


        El circuito puede variar: a veces tendrá compuertas lógicas, resistencias, fuentes de voltaje, etc.
        Tu respuesta debe ser siempre general y adaptable al circuito recibido.
            
            --- REGLAS DEL CIRCUITO ---
            ${reglasDelCircuito}
            ---

            Observa cuidadosamente la imagen proporcionada y compárala punto por punto con las reglas. No seas demasiado estricto con las reglas, a pesar de la mala calidad de imagen, la mayoría de los circuitos están bien. Proporciona tu retroalimentación en el siguiente formato:
            

            **Veredicto Final:** [Escribe "APROBADO" si minimo el 30% del circuito es correcto, o "REQUIERE REVISIÓN" si más de 30% del circuito es incorrecto].

            **Sugerencias:** [Si hay errores, da una sugerencia clara y amable sobre cómo corregir el problema, si la imagen no ofrece suficiente detalle para una evaluación completa, no menciones este aspecto y no des sugerencias en torno a esto.Si todo está bien, felicita al estudiante y proponle un siguiente desafío, como añadir un segundo LED en el pin 12].
        `;

        // Preparamos la imagen para ser enviada a la API
        // La convertimos de buffer (datos binarios) a una cadena de texto base64
        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype,
            },
        };
        
        // Creamos el contenido de la solicitud con el prompt y la imagen
        const contents = [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    imagePart
                ]
            }
        ];

        // Enviamos la solicitud completa (contenido y configuración de seguridad)
        const result = await model.generateContent({ contents, safetySettings });
        const response = await result.response;
        const respuestaDeIA = response.text();

        // Enviamos la respuesta de la IA de vuelta al navegador
        res.json({ feedback: respuestaDeIA });

    } catch (error) {
        // Si algo falla, lo mostramos en la consola del servidor para poder depurarlo
        console.error('Error detallado en el servidor:', error);
        res.status(500).json({ error: 'Hubo un problema al procesar la imagen en el servidor.' });
    }
});

// --- 5. "ENCENDER" EL SERVIDOR ---
app.listen(port, () => {
    console.log(`--- ¡SERVIDOR DE IMÁGENES LISTO! --- Servidor escuchando en http://localhost:${port}/ia.html`);
});