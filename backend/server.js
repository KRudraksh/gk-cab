require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Update the MongoDB connection to use the environment variable
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return;
    }
    
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: false,
      w: 'majority'
    });
    console.log('MongoDB connected to Azure Cosmos DB successfully');
  } catch (error) {
    console.error('MongoDB connection error details:', error);
    // Don't exit the process, just log the error
    // process.exit(1);
  }
};

// Call the connectDB function
connectDB();

// User schema
const userSchema = new mongoose.Schema({
    name: String,
    username: String,
    password: String,
    email: String,
    machineCount: { type: Number, default: 0 }, // New field to store the number of machines
});

const User = mongoose.model('User', userSchema);

// Machine schema
const machineSchema = new mongoose.Schema({
    machineName: String,
    simNumber: String,
    remarks: String,
    status: { type: String, default: 'OFFLINE' }, // Default status
    sensorStatus: { type: String, default: 'None' }, // Default sensor status
    location: { type: String, default: 'None' }, // Default location
    serverConnection: { type: String, default: 'OFFLINE' }, // Default server connection status
});

const Machine = mongoose.model('Machine', machineSchema);

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from .env
const authToken = process.env.TWILIO_AUTH_TOKEN; // Your Auth Token from .env
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number from .env

const client = twilio(accountSid, authToken);

console.log('Environment Variables Loaded:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN);
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);

// API endpoint to add a user
app.post('/api/users', async (req, res) => {
    const { name, username, password, email } = req.body;
    const newUser = new User({ name, username, password, email });

    try {
        await newUser.save();
        res.status(201).send('User added successfully');
    } catch (error) {
        res.status(400).send('Error adding user');
    }
});

// API endpoint to get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send('Error fetching users');
    }
});

// API endpoint to delete a user
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body; // Optional: Check admin password if needed

    try {
        await User.findByIdAndDelete(id);
        res.status(200).send('User deleted successfully');
    } catch (error) {
        res.status(500).send('Error deleting user');
    }
});

// API endpoint to authenticate a user
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.status(200).json({ message: 'Login successful', name: user.name });
        } else {
            res.status(401).send('Invalid username or password');
        }
    } catch (error) {
        res.status(500).send('Error logging in');
    }
});

// API endpoint to add a machine
app.post('/api/machines', async (req, res) => {
    const { machineName, simNumber, remarks, username } = req.body; // Include username in the request body
    const newMachine = new Machine({
        machineName,
        simNumber,
        remarks,
        status: 'OFFLINE', // Set default status
        sensorStatus: 'None', // Set default sensor status
        location: 'None', // Set default location
        serverConnection: 'OFFLINE', // Set default server connection status
    });

    try {
        await newMachine.save();
        
        // Update the user's machine count
        await User.findOneAndUpdate(
            { username: username }, // Find the user by username
            { $inc: { machineCount: 1 } } // Increment the machineCount by 1
        );

        res.status(201).send('Machine added successfully');
    } catch (error) {
        res.status(400).send('Error adding machine');
    }
});

// API endpoint to get all machines
app.get('/api/machines', async (req, res) => {
    try {
        const machines = await Machine.find();
        res.status(200).json(machines);
    } catch (error) {
        res.status(500).send('Error fetching machines');
    }
});

// API endpoint to delete a machine
app.delete('/api/machines/:id', async (req, res) => {
    const { id } = req.params;
    const { password, username } = req.body; // Include username in the request body

    try {
        await Machine.findByIdAndDelete(id);
        
        // Update the user's machine count
        await User.findOneAndUpdate(
            { username: username }, // Find the user by username
            { $inc: { machineCount: -1 } } // Decrement the machineCount by 1
        );

        res.status(200).send('Machine deleted successfully');
    } catch (error) {
        res.status(500).send('Error deleting machine');
    }
});

// API endpoint to send SMS
app.post('/api/send-status', async (req, res) => {
    const { simNumber, message } = req.body; // Get the SIM number and message from the request

    try {
        await client.messages.create({
            body: message, // Use the message sent from the frontend
            to: simNumber, // The recipient's phone number
            from: twilioPhoneNumber, // Your Twilio phone number
        });
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).send('Error sending message');
    }
});

// API endpoint to update a machine
app.patch('/api/machines/:id', async (req, res) => {
    const { id } = req.params;
    const { serverConnection } = req.body; // Get the new server connection status

    try {
        await Machine.findByIdAndUpdate(id, { serverConnection: serverConnection });
        res.status(200).send('Machine updated successfully');
    } catch (error) {
        res.status(500).send('Error updating machine');
    }
});

// API endpoint to get a user by ID
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).send('Error fetching user');
    }
});

// Add this near the top of your routes
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'Server is running correctly' });
});

// Serve static files from the React frontend app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Handle any requests that don't match the above
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Add this to log startup information more clearly
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Node environment: ${process.env.NODE_ENV}`);
    console.log(`MongoDB URI exists: ${Boolean(process.env.MONGODB_URI)}`);
}); 