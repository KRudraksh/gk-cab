require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Add this line to your existing middleware setup
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/gk-cab', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

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
    lastStatusUpdate: { type: Date, default: null }, // Add field to track last status update
    directoryNumbers: { type: [String], default: [] }, // Array to store directory numbers
    phoneBook: { type: [String], default: [] } // Changed to array of phone numbers
});

const Machine = mongoose.model('Machine', machineSchema);

// Machine Operation schema
const machineOperationSchema = new mongoose.Schema({
    machineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Machine',
        required: true
    },
    dateTime: {
        type: Date,
        default: Date.now
    },
    fuelConsumption: {
        type: Number,
        required: true
    },
    pressure: {
        type: Number,
        required: true
    },
    processTime: {
        type: Number,
        required: true
    },
    location: {
        type: String,
        required: true
    }
});

const MachineOperation = mongoose.model('MachineOperation', machineOperationSchema);

// Create a simple message queue to store messages for ESP32 devices
const messageQueue = new Map(); // Map to store messages for different SIM numbers

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
        phoneBook: [], // Set default phoneBook value
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

// API endpoint to set all machines status to OFFLINE
app.post('/api/machines/reset-status', async (req, res) => {
    try {
        // Update all machines to set status to OFFLINE
        await Machine.updateMany(
            {}, // Empty filter means all documents
            { 
                $set: { 
                    status: 'OFFLINE'
                } 
            }
        );
        
        res.status(200).json({ message: 'All machines status reset to OFFLINE' });
    } catch (error) {
        console.error('Error resetting machine statuses:', error);
        res.status(500).send('Error resetting machine statuses');
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

// API endpoint to save directory numbers for a specific machine
app.post('/api/machines/:machineId/directory-numbers', async (req, res) => {
    try {
        const { machineId } = req.params;
        const { directoryNumbers } = req.body;
        
        if (!Array.isArray(directoryNumbers)) {
            return res.status(400).send('directoryNumbers must be an array');
        }
        
        await Machine.findByIdAndUpdate(
            machineId,
            { directoryNumbers },
            { new: true }
        );
        
        res.status(200).json({ message: 'Directory numbers saved successfully' });
    } catch (error) {
        console.error('Error saving directory numbers:', error);
        res.status(500).send('Error saving directory numbers');
    }
});

// API endpoint to get directory numbers for a specific machine
app.get('/api/machines/:machineId/directory-numbers', async (req, res) => {
    try {
        const { machineId } = req.params;
        
        const machine = await Machine.findById(machineId);
        if (!machine) {
            return res.status(404).send('Machine not found');
        }
        
        res.status(200).json({ directoryNumbers: machine.directoryNumbers || [] });
    } catch (error) {
        console.error('Error fetching directory numbers:', error);
        res.status(500).send('Error fetching directory numbers');
    }
});

// API endpoint to get a single machine by ID
app.get('/api/machines/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const machine = await Machine.findById(id);
        if (!machine) {
            return res.status(404).send('Machine not found');
        }
        res.status(200).json(machine);
    } catch (error) {
        console.error('Error fetching machine:', error);
        res.status(500).send('Error fetching machine');
    }
});

// API endpoint to delete a machine
app.delete('/api/machines/:id', async (req, res) => {
    const { id } = req.params;
    const { password, username, userId } = req.body; // Accept both username and userId

    try {
        await Machine.findByIdAndDelete(id);
        
        // Update the user's machine count using userId if provided
        if (userId) {
            await User.findByIdAndUpdate(
                userId,
                { $inc: { machineCount: -1 } } // Decrement the machineCount by 1
            );
        } else if (username) {
            // Fallback to username if provided (for backward compatibility)
            await User.findOneAndUpdate(
                { username: username },
                { $inc: { machineCount: -1 } }
            );
        }

        res.status(200).send('Machine deleted successfully');
    } catch (error) {
        console.error('Error deleting machine:', error);
        res.status(500).send('Error deleting machine');
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

// API endpoint to get machine operations for a specific machine
app.get('/api/machines/:id/operations', async (req, res) => {
    const { id } = req.params;
    
    try {
        const operations = await MachineOperation.find({ machineId: id }).sort({ dateTime: -1 });
        res.status(200).json(operations);
    } catch (error) {
        console.error('Error fetching machine operations:', error);
        res.status(500).send('Error fetching machine operations');
    }
});

// API endpoint to delete a specific operation
app.delete('/api/operations/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await MachineOperation.findByIdAndDelete(id);
        res.status(200).send('Operation record deleted successfully');
    } catch (error) {
        console.error('Error deleting operation record:', error);
        res.status(500).send('Error deleting operation record');
    }
});

// API endpoint to receive data from ESP32+SIM800L module
app.post('/api/esp32data', async (req, res) => {
    console.log('------------ ESP32+SIM800L DATA RECEIVED ------------');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Data:', req.body);
    console.log('---------------------------------------------------');
    
    // Check if this is a simple message (from directory update)
    if (req.body && req.body.message) {
        console.log('Message received:', req.body.message);
        
        // Store message in queue based on target SIM number (if provided) or use 'default' queue
        const targetSim = req.body.simNumber || 'default';
        
        if (!messageQueue.has(targetSim)) {
            messageQueue.set(targetSim, []);
        }
        
        // Add message to queue with timestamp
        messageQueue.get(targetSim).push({
            message: req.body.message,
            timestamp: new Date().toISOString()
        });
        
        // Limit queue size to prevent memory issues (keep latest 20 messages)
        const messages = messageQueue.get(targetSim);
        if (messages.length > 20) {
            messageQueue.set(targetSim, messages.slice(-20));
        }
        
        console.log(`Message queued for SIM number: ${targetSim}`);
    }
    // Check if this is a directory update command
    else if (req.body && req.body.cmd === 'dir_update') {
        console.log('Directory update command received');
        
        const { simNumber, count } = req.body;
        const targetSim = simNumber || 'default';
        
        if (!messageQueue.has(targetSim)) {
            messageQueue.set(targetSim, []);
        }
        
        // Build a message with all the directory information
        let formattedMessage = `cmd=dir_update&count=${count}`;
        
        // Add each directory number to the message
        for (let i = 1; i <= parseInt(count); i++) {
            if (req.body[`number${i}`]) {
                formattedMessage += `&number${i}=${req.body[`number${i}`]}`;
            }
        }
        
        // Add message to queue with timestamp
        messageQueue.get(targetSim).push({
            message: formattedMessage,
            timestamp: new Date().toISOString()
        });
        
        console.log(`Directory update queued for SIM number: ${targetSim}`);
    }
    // Check if this is a get_status command
    else if (req.body && req.body.cmd === 'get_status') {
        console.log('Get status command received');
        
        const { simNumber } = req.body;
        const targetSim = simNumber || 'default';
        
        if (!messageQueue.has(targetSim)) {
            messageQueue.set(targetSim, []);
        }
        
        // Build the get_status command message
        let formattedMessage = 'cmd=get_status';
        
        // Add message to queue with timestamp
        messageQueue.get(targetSim).push({
            message: formattedMessage,
            timestamp: new Date().toISOString()
        });
        
        console.log(`Get status command queued for SIM number: ${targetSim}`);
    }
    // Check if this is a GET_STATUS response from a device
    else if (req.body && req.body.cmd === 'STATUS_UPDATE') {
        const { simNumber, status, sensorStatus, location, phoneBook } = req.body;
        
        if (simNumber) {
            try {
                // Find the machine with this SIM number
                const machine = await Machine.findOne({ simNumber });
                
                if (machine) {
                    // Update machine with received data
                    const updateData = {
                        lastStatusUpdate: new Date()
                    };
                    
                    // Only update fields that were provided
                    if (status) updateData.status = status;
                    if (sensorStatus) updateData.sensorStatus = sensorStatus;
                    if (location) updateData.location = location;
                    
                    // Process phoneBook if provided
                    if (phoneBook) {
                        // Check if phoneBook is already a JSON array
                        if (typeof phoneBook === 'object' && Array.isArray(phoneBook)) {
                            updateData.phoneBook = phoneBook;
                        } else {
                            // Try to parse it as JSON if it's a string
                            try {
                                updateData.phoneBook = JSON.parse(phoneBook);
                                if (!Array.isArray(updateData.phoneBook)) {
                                    // If parsed but not an array, create an array with this single item
                                    updateData.phoneBook = [phoneBook];
                                }
                            } catch (e) {
                                // If parsing fails, treat it as a single item
                                updateData.phoneBook = [phoneBook];
                            }
                        }
                    }
                    
                    // Update the machine in the database
                    await Machine.findByIdAndUpdate(machine._id, updateData);
                    
                    console.log(`Updated machine status for SIM number: ${simNumber}`);
                } else {
                    console.log(`No machine found with SIM number: ${simNumber}`);
                }
            } catch (error) {
                console.error('Error updating machine status:', error);
            }
        } else {
            console.log('SIM number missing in GET_STATUS request');
        }
    }
    // Check if this is a JOB command
    else if (req.body && req.body.cmd === 'JOB') {
        const { simNumber, fuelConsumption, pressure, processTime, location } = req.body;
        
        if (simNumber) {
            try {
                // Find the machine with this SIM number
                const machine = await Machine.findOne({ simNumber });
                
                if (machine) {
                    // Create a new operation record
                    const newOperation = new MachineOperation({
                        machineId: machine._id,
                        dateTime: new Date(),
                        fuelConsumption: parseFloat(fuelConsumption) || 0,
                        pressure: parseFloat(pressure) || 0,
                        processTime: parseFloat(processTime) || 0,
                        location: location || 'Unknown'
                    });
                    
                    // Save the new operation to the database
                    await newOperation.save();
                    
                    console.log(`Created new operation record for machine: ${machine.machineName} (SIM: ${simNumber})`);
                } else {
                    console.log(`No machine found with SIM number: ${simNumber}`);
                }
            } catch (error) {
                console.error('Error creating new operation record:', error);
            }
        } else {
            console.log('SIM number missing in JOB request');
        }
    }
    
    // Send a success response back to the device
    res.status(200).send('Data received successfully');
});

// Add a new GET endpoint for ESP32 to retrieve queued messages
app.get('/api/esp32data', async (req, res) => {
    console.log('------------ ESP32+SIM800L GET REQUEST ------------');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Query params:', req.query);
    console.log('---------------------------------------------------');
    
    // Get SIM number from query parameters or use 'default'
    const simNumber = req.query.simNumber || 'default';
    
    // Check if there are messages for this device
    if (messageQueue.has(simNumber) && messageQueue.get(simNumber).length > 0) {
        // Get all messages for this device
        const messages = messageQueue.get(simNumber);
        console.log(`Sending ${messages.length} messages to device with SIM: ${simNumber}`);
        
        // Clear the queue for this device
        messageQueue.set(simNumber, []);
        
        // Return messages in x-www-form-urlencoded format
        // Convert array of message objects to query string format
        const formattedMessages = messages.map((msg, index) => 
            `message${index + 1}=${encodeURIComponent(msg.message)}&timestamp${index + 1}=${encodeURIComponent(msg.timestamp)}`
        ).join('&');
        
        res.set('Content-Type', 'application/x-www-form-urlencoded');
        res.send(formattedMessages);
    } else {
        // No messages, return empty form data
        res.set('Content-Type', 'application/x-www-form-urlencoded');
        res.send('status=no_messages');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 