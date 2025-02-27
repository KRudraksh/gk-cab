import React, { useState, useEffect } from 'react';
import './AdminDashboard.css'; // Importing the CSS file for styles

const Dashboard = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [users, setUsers] = useState([]);
    const [showPassword, setShowPassword] = useState({}); // To track which passwords to show
    const [userIdToDelete, setUserIdToDelete] = useState(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false); // State for edit modal
    const [selectedUserId, setSelectedUserId] = useState(null); // State to track the selected user for editing
    const [userMachines, setUserMachines] = useState([]);
    const [machineIdToDelete, setMachineIdToDelete] = useState(null);
    const [isDeleteMachineModalOpen, setIsDeleteMachineModalOpen] = useState(false);
    const [selectedUserName, setSelectedUserName] = useState(''); // State to hold the selected user's name

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            // console.log('Fetched users:', data); // Log the fetched users
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        // Reset form fields
        setName('');
        setUsername('');
        setPassword('');
        setEmail('');
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        const userData = { name, username, password, email };

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                alert('User added successfully!');
                closeModal();
                fetchUsers(); // Refresh the user list
            } else {
                alert('Failed to add user.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const togglePasswordVisibility = (id) => {
        setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const openDeleteModal = (userId) => {
        setUserIdToDelete(userId);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setAdminPassword('');
    };

    const handleDeleteUser = async () => {
        try {
            const response = await fetch(`/api/users/${userIdToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: adminPassword }), // Optional: Send admin password if needed
            });

            if (response.ok) {
                alert('User deleted successfully!');
                fetchUsers(); // Refresh the user list
                closeDeleteModal();
            } else {
                const errorMessage = await response.text();
                alert(`Failed to delete user: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const openEditModal = async (userId) => {
        setSelectedUserId(userId);
        setIsEditModalOpen(true);
        await fetchUserMachines(userId);
        await fetchUserName(userId); // Fetch the user's name
    };

    const fetchUserMachines = async (userId) => {
        try {
            const response = await fetch(`/api/machines?username=${userId}`);
            const machines = await response.json();
            setUserMachines(machines);
        } catch (error) {
            console.error('Error fetching user machines:', error);
        }
    };

    const fetchUserName = async (userId) => {
        try {
            const response = await fetch(`/api/users/${userId}`); // Adjust the endpoint as necessary
            const user = await response.json();
            setSelectedUserName(user.name); // Set the user's name
        } catch (error) {
            console.error('Error fetching user name:', error);
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setSelectedUserId(null);
    };

    const openDeleteMachineModal = (machineId) => {
        setMachineIdToDelete(machineId);
        setIsDeleteMachineModalOpen(true);
    };

    const closeDeleteMachineModal = () => {
        setIsDeleteMachineModalOpen(false);
        setAdminPassword('');
    };

    const handleDeleteMachine = async () => {
        try {
            const response = await fetch(`/api/machines/${machineIdToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: adminPassword }), // Send admin password for confirmation
            });

            if (response.ok) {
                alert('Machine deleted successfully!');
                fetchUserMachines(selectedUserId); // Refresh the machines for the selected user
                closeDeleteMachineModal();
            } else {
                const errorMessage = await response.text();
                alert(`Failed to delete machine: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleGetStatus = async (machineId) => {
        const messageBody = `PASS: dMiiMtXVm71QHVgX\nCMD: STATUS_CHECK`; // Adjust the message format as needed

        try {
            const response = await fetch('/api/send-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    simNumber: userMachines.find(machine => machine._id === machineId).simNumber, // Get the SIM number of the selected machine
                    message: messageBody // Send the message format
                }), 
            });

            if (response.ok) {
                alert('Status requested!'); // Notify the user
            } else {
                const errorMessage = await response.text();
                alert(`Failed to send message: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleToggleServerConnection = async (machineId) => {
        const machine = userMachines.find(machine => machine._id === machineId);
        const newStatus = machine.serverConnection === 'OFFLINE' ? 'ONLINE' : 'OFFLINE'; // Toggle status

        try {
            const response = await fetch(`/api/machines/${machineId}`, {
                method: 'PATCH', // Use PATCH to update the existing machine
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ serverConnection: newStatus }), // Send the new status
            });

            if (response.ok) {
                alert(`Server connection set to ${newStatus}!`);
                fetchUserMachines(selectedUserId); // Refresh the machines for the selected user
            } else {
                const errorMessage = await response.text();
                alert(`Failed to update server connection: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-heading">GK-CAB</h1>
            <h2 className="sub-sub-heading">ADMIN PORTAL</h2>
            <button className="add-user-button" onClick={openModal}>Add User</button>

            {isModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={closeModal}>&times;</span>
                        <h3>Add User</h3>
                        <form onSubmit={handleAddUser}>
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <button type="submit">Add User</button>
                            <button type="button" onClick={closeModal}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={closeDeleteModal}>&times;</span>
                        <h3>Confirm Deletion</h3>
                        <p>Enter admin password to confirm deletion:</p>
                        <input
                            type="password"
                            placeholder="Admin Password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            required
                        />
                        <button onClick={handleDeleteUser}>Delete User</button>
                        <button onClick={closeDeleteModal}>Cancel</button>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="modal_1">
                    <div className="modal-content_1">
                        <span className="close-button" onClick={closeEditModal}>&times;</span>
                        <h3>Edit Machines for User: {selectedUserName}</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Machine Name</th>
                                    <th>SIM Number</th>
                                    <th>Status</th>
                                    <th>Sensor Status</th>
                                    <th>Location</th>
                                    <th>Server Connection</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userMachines.map((machine) => (
                                    <tr key={machine._id}>
                                        <td>{machine.machineName}</td>
                                        <td>{machine.simNumber}</td>
                                        <td>{machine.status}</td>
                                        <td>{machine.sensorStatus}</td>
                                        <td>{machine.location}</td>
                                        <td>{machine.serverConnection}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => openDeleteMachineModal(machine._id)}>Delete</button>
                                                <button onClick={() => handleGetStatus(machine._id)}>Get Status</button>
                                                <button onClick={() => handleToggleServerConnection(machine._id)}>
                                                    {machine.serverConnection === 'OFFLINE' ? 'Enable Server' : 'Disable Server'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={closeEditModal}>Cancel</button>
                    </div>
                </div>
            )}

            {isDeleteMachineModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close-button" onClick={closeDeleteMachineModal}>&times;</span>
                        <h3>Confirm Deletion</h3>
                        <p>Enter admin password to confirm deletion:</p>
                        <input
                            type="password"
                            placeholder="Admin Password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            required
                        />
                        <button onClick={handleDeleteMachine}>Delete Machine</button>
                        <button onClick={closeDeleteMachineModal}>Cancel</button>
                    </div>
                </div>
            )}

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Password</th>
                        <th>Email</th>
                        <th>Active Machines</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user._id}>
                            <td>{user.name}</td>
                            <td>{user.username}</td>
                            <td>
                                {showPassword[user._id] ? user.password : '••••••••'}
                                <button onClick={() => togglePasswordVisibility(user._id)}>
                                    {showPassword[user._id] ? 'Hide' : 'Show'}
                                </button>
                            </td>
                            <td>{user.email}</td>
                            <td>
                                {user.machineCount}
                                <button className="edit-machines-button" onClick={() => openEditModal(user._id)}>Edit Machines</button>
                            </td>
                            <td>
                                <button className="delete-button" onClick={() => openDeleteModal(user._id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Dashboard; 