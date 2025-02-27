import React, { useState, useEffect } from 'react';
import './UserDashboard.css'; // Importing the CSS file for styles

const UserDashboard = () => {
    const name = localStorage.getItem('name'); // Retrieve name from local storage
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [machineName, setMachineName] = useState('');
    const [simNumber, setSimNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [machines, setMachines] = useState([]); // State to hold machines
    const [selectedMachineId, setSelectedMachineId] = useState(null); // State to track selected machine
    const [selectedMachineDetails, setSelectedMachineDetails] = useState({}); // State to hold selected machine details
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // State for delete confirmation modal
    const [adminPassword, setAdminPassword] = useState(''); // State for admin password
    const [notification, setNotification] = useState(''); // State for notification message
    const [isDirectoryUpdateModalOpen, setIsDirectoryUpdateModalOpen] = useState(false); // State for directory update modal

    const handleLogout = () => {
        localStorage.removeItem('username'); // Remove username from local storage
        localStorage.removeItem('name'); // Remove name from local storage
        window.location.href = '/'; // Redirect to login page
    };

    const openMachineModal = () => {
        setIsMachineModalOpen(true);
    };

    const closeMachineModal = () => {
        setIsMachineModalOpen(false);
        setMachineName('');
        setSimNumber('');
        setRemarks('');
    };

    const handleAddMachine = async (e) => {
        e.preventDefault();
        const machineData = { 
            machineName, 
            simNumber, 
            remarks, 
            username: localStorage.getItem('username') // Send the username
        };

        try {
            const response = await fetch('http://localhost:5000/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(machineData),
            });

            if (response.ok) {
                alert('Machine added successfully!');
                closeMachineModal();
                fetchMachines(); // Refresh the machine list
            } else {
                alert('Failed to add machine.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchMachines = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/machines');
            const data = await response.json();
            setMachines(data); // Set the machines state
        } catch (error) {
            console.error('Error fetching machines:', error);
        }
    };

    const fetchUserData = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/users'); // Adjust the endpoint as necessary
            const users = await response.json();
            const currentUser = users.find(user => user.username === localStorage.getItem('username')); // Assuming username is stored in local storage
            if (currentUser) {
                console.log(`Number of machines for user ${currentUser.username}: ${currentUser.machineCount}`); // Log to console
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    useEffect(() => {
        fetchMachines(); // Fetch machines when the component mounts
        fetchUserData(); // Fetch user data to get machine count
    }, []);

    const handleSelectMachine = (id) => {
        setSelectedMachineId(id); // Set the selected machine ID
        const selectedMachine = machines.find(machine => machine._id === id);
        setSelectedMachineDetails(selectedMachine); // Set the selected machine details
    };

    const openDeleteModal = () => {
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setAdminPassword('');
    };

    const handleDeleteMachine = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/machines/${selectedMachineId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: adminPassword, username: localStorage.getItem('username') }), // Send username
            });

            if (response.ok) {
                alert('Machine deleted successfully!');
                closeDeleteModal();
                fetchMachines(); // Refresh the machine list
                setSelectedMachineId(null); // Clear selected machine
                setSelectedMachineDetails({}); // Clear selected machine details
            } else {
                const errorMessage = await response.text();
                alert(`Failed to delete machine: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleGetStatus = async () => {
        const messageBody = `PASS: dMiiMtXVm71QHVgX\nCMD: STATUS_CHECK`; // New message format

        try {
            const response = await fetch('http://localhost:5000/api/send-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    simNumber: selectedMachineDetails.simNumber, // Send the SIM number
                    message: messageBody // Send the new message format
                }), 
            });

            if (response.ok) {
                setNotification('Status requested!'); // Set notification message
                setTimeout(() => setNotification(''), 3000); // Clear notification after 3 seconds
            } else {
                const errorMessage = await response.text();
                alert(`Failed to send message: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const openDirectoryUpdateModal = () => {
        setIsDirectoryUpdateModalOpen(true);
    };

    const closeDirectoryUpdateModal = () => {
        setIsDirectoryUpdateModalOpen(false);
    };

    return (
        <div className="user-dashboard-container">
            <h1 className="dashboard-heading">GK-CAB</h1>
            <h2 className="sub-heading">DATA PORTAL</h2>
            <h2 className="greeting">Hello, {name}</h2>
            <button className="logout-button" onClick={handleLogout}>Logout</button>

            <hr className="divider" /> {/* Horizontal line below headings */}

            <div className="dashboard-content">
                <div className="left-section">
                    <button className="add-machine-button" onClick={openMachineModal}>Add New Machine</button>
                    {/* Display the list of machines */}
                    <div className="machine-list">
                        {machines.map((machine) => (
                            <div
                                key={machine._id}
                                className="machine-item"
                                style={{
                                    backgroundColor: selectedMachineId === machine._id ? '#a9a9a9' : '#c1bfbf', // Change color if selected
                                }}
                                onClick={() => handleSelectMachine(machine._id)} // Handle machine selection
                            >
                                <p><strong>Machine Name:</strong> {machine.machineName}</p>
                                <p><strong>SIM Number:</strong> {machine.simNumber}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="vertical-divider"></div> {/* Vertical line */}
                <div className="right-section">
                    <div className="right_up">
                        {/* Display selected machine details */}
                        {selectedMachineId && (
                            <div style={{ position: 'relative' }}>
                                <button className="delete-machine-button" onClick={openDeleteModal} style={{ position: 'absolute', top: 45, right: 10 }}>Delete Machine</button>
                                <button className="get-status-button" onClick={handleGetStatus} style={{ position: 'absolute', top: -25, right: 10 }}>Get Status</button>
                                <button className="directory-update-button" onClick={openDirectoryUpdateModal} style={{ position: 'absolute', top: 10, right: 10 }}>Directory Update</button> {/* New Directory Update button */}
                                <p><strong>Machine Name:</strong> {selectedMachineDetails.machineName}</p>
                                <p><strong>SIM Number:</strong> {selectedMachineDetails.simNumber}</p>
                                <p>
                                    <strong>Status:</strong>{' '}
                                    <span style={{ 
                                        fontWeight: 'bold',
                                        color: '#cf1313'
                                    }}>
                                        {selectedMachineDetails.status || 'OFFLINE'}
                                    </span>
                                </p>
                                <p><strong>Sensor Status:</strong> {selectedMachineDetails.sensorStatus || 'None'}</p> {/* Display sensor status */}
                                <p><strong>Location:</strong> {selectedMachineDetails.location || 'None'}</p> {/* Display location */}
                                <p><strong>Server Connection:</strong> {selectedMachineDetails.serverConnection || 'OFFLINE'}</p>
								<p><strong>Remarks:</strong> {selectedMachineDetails.remarks}</p> {/* Display remarks */}
                            </div>
                        )}
                    </div>
                    <hr className="horizontal-divider" /> {/* Horizontal divider */}
                    <div className="right_down">
                        {/* Content for the lower right section goes here */}
                        <p>This is the lower right section.</p>
                    </div>
                </div>
            </div>

            {isMachineModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={closeMachineModal}>&times;</span>
                        <h3>Add New Machine</h3>
                        <form onSubmit={handleAddMachine}>
                            <input
                                type="text"
                                placeholder="Machine Name"
                                value={machineName}
                                onChange={(e) => setMachineName(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                placeholder="SIM Number"
                                value={simNumber}
                                onChange={(e) => setSimNumber(e.target.value)}
                                required
                            />
                            <textarea
                                placeholder="Remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                            <button type="submit">Save</button>
                            <button type="button" onClick={closeMachineModal}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={closeDeleteModal}>&times;</span>
                        <h3>Confirm Deletion</h3>
                        <p>Enter user password to confirm deletion:</p>
                        <input
                            type="password"
                            placeholder="Admin Password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            required
                        />
                        <button onClick={handleDeleteMachine}>Delete Machine</button>
                        <button onClick={closeDeleteModal}>Cancel</button>
                    </div>
                </div>
            )}

            {isDirectoryUpdateModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={closeDirectoryUpdateModal}>&times;</span>
                        <h3>Directory Update</h3>
                        <p>Update the directory information here.</p>
                        {/* Add form or content for directory update */}
                        <button onClick={closeDirectoryUpdateModal}>Close</button>
                    </div>
                </div>
            )}

            {notification && <div className="notification">{notification}</div>} {/* Notification */}
        </div>
    );
};

export default UserDashboard; 