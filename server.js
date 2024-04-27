// server.js
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { check, validationResult } = require('express-validator');
const app = express();

// Configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'learning_management'
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// Serve static files from the default directory
app.use(express.static(__dirname));

// Set up middleware to parse incoming JSON data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// Define a User representation for clarity
const User = {
    tableName: 'users', 
    createUser: function(newUser, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },  
    getUserByEmail: function(email, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
    },
    getUserByUsername: function(username, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
    }
};

// Course object
const Course = {
    tableName: 'courses',
    createCourse: function(newCourse, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newCourse, callback);
    },
    getCourseByName: function(courseName, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE name = ?', courseName, callback);
    },
    addUserToCourse: function(courseId, userId, callback) {
        connection.query('UPDATE ' + this.tableName + ' SET user_ids = JSON_ARRAY_APPEND(user_ids, "$", ?) WHERE id = ?', [userId, courseId], callback);
    },
    getUsersInCourse: function(courseId, callback) {
        connection.query('SELECT user_ids FROM ' + this.tableName + ' WHERE id = ?', courseId, (error, results) => {
            if (error) {
                callback(error, null);
                return;
            }
            const userIDs = results[0].user_ids || [];
            callback(null, userIDs);
        });
    }
};


// Add logging to the '/register' route handler
app.post('/register', [
    // Validation middleware...
], async (req, res) => {
    console.log('Received registration request:', req.body); // Log incoming request data

    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array()); // Log validation errors
            return res.status(400).json({ errors: errors.array() });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

        // Create a new user object
        const newUser = {
            email: req.body.email,
            username: req.body.username,
            password: hashedPassword,
            full_name: req.body.full_name
        };

        // Insert user into MySQL
        User.createUser(newUser, (error, results, fields) => {
            if (error) {
                console.error('Error inserting user:', error); // Log database insertion error
                return res.status(500).json({ error: 'Internal server error' });
            }
            console.log('Inserted a new user with id:', results.insertId); // Log successful user insertion
            res.status(201).json(newUser);
        });
    } catch (error) {
        console.error('Server error:', error); // Log any other server-side errors
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Retrieve user from database
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            res.status(401).send('Invalid username or password');
        } else {
            const user = results[0];
            // Compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    // Store user in session
                    req.session.user = user;
                    res.send('Login successful');
                } else {
                    res.status(401).send('Invalid username or password');
                }
            });
        }
    });
});


// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy();
    // res.redirect()
    res.redirect('/userlogin.html');
    // res.send('Logout successful');
});

//Dashboard route
app.get('/dashboard', (req, res) => {
    // Assuming you have middleware to handle user authentication and store user information in req.user
    const userFullName = req.user.full_name;
    res.render('dashboard', { fullName: userFullName });
});

// Route to retrieve course content
app.get('/course/:id', (req, res) => {
    const courseId = req.params.id;
    const sql = 'SELECT * FROM courses WHERE id = ?';
    db.query(sql, [courseId], (err, result) => {
      if (err) {
        throw err;
      }
      // Send course content as JSON response
      res.json(result);
    });
  });

// Start server
const PORT = process.env.PORT || 3300;
app.listen(PORT, () => {
    console.log(`Server running on port localhost:${PORT}`);
});