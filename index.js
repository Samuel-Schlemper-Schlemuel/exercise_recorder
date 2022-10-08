// Criando conts
require('dotenv').config()
const express = require('express')
const mongoose  = require('mongoose')
const app = express()
const PORT = process.env.PORT || 3000
const URI = process.env.MONGO_URI

//Trabalhando com mongoose
mongoose.connect(URI, {useNewUrlParser: true, useUnifiedTopology: true})

const userSchema = new mongoose.Schema({
    username: String
})

const exercisesSchema = new mongoose.Schema({
    id: String,
    description: String,
    duration: Number,
    date: String
})

const userModel = mongoose.model('user', userSchema)
const exercisesModel = mongoose.model('exercises', exercisesSchema)

function saveUser(username){
    let userData = new userModel({
        username: username
    })

    userData.save()
    return userData._id
}

function saveExercise(id, description, duration, date){
    let exerciseData = new exercisesModel({
        id: id,
        description: description,
        duration: duration,
        date: date
    })

    exerciseData.save()
}

async function getName(_id){
    let name

    await userModel.find({
        _id: _id
    })
    .then(doc => {
        name = doc[0].username
    })
    .catch(err => {
        name = err
    })

    return name
}

async function getAllExercises(id){
   let exercises = []

    await exercisesModel.find({
        id: id
    })
    .then(doc => {
        exercises = doc
    })
    .catch(err => {
        console.error(err)
    })

    return exercises
}

// Trabalhando com requisição de HTTP
app.use(express.static(__dirname + '/public'))

app.use(express.urlencoded({
    extended: true
}))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/Home.html')
})

app.post('/api/users', (req, res) => {
    const user = req.body.username
    const id = saveUser(user)
    res.json({"username": user, "_id": id})
})

app.get('/api/users', async (req, res) => {
    allUsers = await userModel.find()
    .then(doc => {
        return doc
    })
    .catch(err => {
        console.error(err)
    })

    res.json(allUsers)
})

app.post('/api/users/:_id/exercises', async ( req, res) => {
    const _id = req.params._id
    const username = await getName(_id)
    if(typeof username == 'object'){
        return res.send("This ID don't exist")
    }
    const {description, duration} = req.body
    const simpleDate = req.body.date
    let date

    if(simpleDate.length < 1){
        let atualDate = new Date()
        date = atualDate.toDateString()
    } else {
            let dateArray

            if(simpleDate.split('-').length === 3) {
                dateArray = simpleDate.split('-')
            } else if (simpleDate.split(' ').length === 3){
                dateArray = simpleDate.split(' ')
            } else {
                dateArray = simpleDate.split('/')
            }
            
            let objectDate = new Date(dateArray[0], Number.parseInt(dateArray[1]) - 1, dateArray[2])
            
            if(objectDate == 'Invalid Date'){
                return res.send('Invalid Date')
            }

            date = objectDate.toDateString()
    }

    saveExercise(_id, description, duration, date)
    res.json({'_id': _id, 'username': username, 'date': date, 'duration': duration, 'description': description})
})

app.get('/api/users/:_id/logs', async (req, res) => {
    const _id = req.params._id
    const username = await getName(_id)
    const {from, to, limit} = req.query

    if(typeof username == 'object'){
        return res.send("This ID don't exist")
    }

    const exercises = await getAllExercises(_id)
    let finalExercises = []

    for(i in exercises){
        let finalObject = {}
        for(key in exercises[i]){
            if(key == 'description' || key == 'duration' || key == 'date'){
                finalObject[key] = exercises[i][key]
            }
        }
        finalExercises.push(finalObject)
    }

    if(from != undefined){
        let changeable = [...finalExercises]

        for(i in finalExercises){
            let atualExercise = finalExercises[i]
            let date = new Date(atualExercise.date)
            let de = new Date(from)
            if(date < de){
                changeable.splice(changeable.indexOf(atualExercise), 1)
            }
        }

        finalExercises = changeable
    }
    if(to != undefined){
        let changeable = [...finalExercises]

        for(i in finalExercises){
            let atualExercise = finalExercises[i]
            let date = new Date(atualExercise.date)
            let de = new Date(to)
            if(date > de){
                changeable.splice(changeable.indexOf(atualExercise), 1)
            }
        }
        
        finalExercises = changeable
    }    
    if(limit != undefined){
        if(finalExercises.length > limit){
            finalExercises = finalExercises.splice(0, limit)
        }
    }

    const count = finalExercises.length

    res.json({'username': username, 'count': count, '_id': _id, 'log': finalExercises})
})

app.listen(PORT)