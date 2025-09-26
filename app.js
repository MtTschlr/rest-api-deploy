const express = require('express') // require -> commonJS
const crypto = require('crypto') // Módulo nativo de Node.js para generar ids únicos
const movies = require('./movies.json') // Importar el JSON de películas
const { validateMovie, validatePartialMovie } = require('./movies') // Importar la función para validar películas 

const app = express()
app.use(express.json()) // Middleware para parsear el body a JSON
app.disable('x-powered-by') // Deshabilitar la cabecera x-powered-by

// métodos normales: GET/HEAD/POST
// métodos complejos: PUT/PATCH/DELETE

app.use((req, res, next) => {
  const origin = req.header('origin')
  if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  next()
})

// CORS PRE-Flight
// OPTIONS


// Configurar CORS (Cross-Origin Resource Sharing)
// CORS es un mecanismo de seguridad que permite o restringe las peticiones HTTP entre diferentes dominios
// Por defecto, los navegadores bloquean las peticiones HTTP entre diferentes dominios por seguridad
// Si queremos permitir que nuestro servidor sea consumido desde otros dominios, tenemos que configurar CORS
const ACCEPTED_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:1234',
    'https://movies.com',
    'https://admin.movies.com'
]

app.get('/movies', (req, res) => {
    const origin = req.header('origin') // Obtener el origen de la petición
    if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
    // el navegador nunca envía la cabecera origin en peticiones same-origin
        res.header('Access-Control-Allow-Origin', origin) // Permitir CORS solo para los orígenes aceptados
    }

    const { genre } = req.query // req.query -> { genre: 'action' }
    if (genre) {
        const filteredMovies = movies.filter(
            movie => movie.genre.some(g => g.toLowerCase() === genre.toLowerCase())
        )
        return res.json(filteredMovies)
    }
    res.json(movies)
})

app.get('/', (req, res) => {
    res.json({ message: 'Hola mundo' })
})


app.get('/movies/:id', (req, res) => { // path-to-regexp: es una biblioteca que permite definir rutas con parámetros
    const { id } = req.params // req.params -> { id: '1' }
    const movie = movies.find(movie => movie.id === id)
    if (movie) return res.json(movie)
})

app.post('/movies', (req, res) => { 
    // Validar que el body tiene los datos correctos
    const result = validateMovie(req.body)
    
    if (result.error) {
        // aquí también se podría utilizar el 422: Unprocessable Entity
        return res.status(400).json({ error: result.error.issues })    
    }

    const newMovie = {
        id: crypto.randomUUID(), //UUID V4
        ...result.data // los datos ya validados
    }

    /* Esto no sería REST, porque no estamos guardando 
    el estado de la aplicación en memoria */
    movies.push(newMovie)

    res.status(201).json(newMovie) // actualizar la caché del cliente
})

app.delete('/movies/:id', (req, res) => {
    const { id } = req.params
    const movieIndex = movies.findIndex(movie => movie.id === id)

    if (movieIndex === -1) {
        return res.status(404).json({ error: 'La película no existe' })
    }

    movies.splice(movieIndex, 1) // Eliminar la película del array

    res.json({ message: 'La película ha sido eliminada' })
})


// PATCH /movies/:id -> actualizar una película por su id (actualización parcial)
app.patch('/movies/:id', (req, res) => {
    const result = validatePartialMovie(req.body)

    if (result.error) {
        return res.status(400).json({ error: result.error.issues })
    }

    const { id } = req.params
    const movieIndex = movies.findIndex(movie => movie.id === id)

    if (movieIndex === -1) {
        return res.status(404).json({ error: 'La película no existe' })
    }

    const updateMovie = {
        ...movies[movieIndex],
        ...result.data
    }

    movies[movieIndex] = updateMovie

    return res.json(updateMovie)

})

app.options('/movies/:id', (req, res) => {
    const origin = req.header('origin')
    if (ACCEPTED_ORIGINS.includes(origin) || !origin) {
        res.header('Access-Control-Allow-Origin', origin)
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
        res.header('Access-Control-Allow-Headers', 'Content-Type')
    }
    res.send()
})

const PORT = process.env.PORT ?? 1234

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto http://localhost:${PORT}`)
})