import React, { useState, useEffect } from 'react';
import './UserDashboard.css'; // Importing the CSS file for styles
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const UserDashboard = () => {
    const name = localStorage.getItem('name'); // Retrieve name from local storage
    const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
    const [machineName, setMachineName] = useState('');
    const [simNumber, setSimNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [operator, setOperator] = useState(''); // New state for operator
    const [operationArea, setOperationArea] = useState(''); // New state for operation area
    const [machines, setMachines] = useState([]); // State to hold machines
    const [selectedMachineId, setSelectedMachineId] = useState(null); // State to track selected machine
    const [selectedMachineDetails, setSelectedMachineDetails] = useState({}); // State to hold selected machine details
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // State for delete confirmation modal
    const [userPassword, setuserPassword] = useState(''); // State for admin password
    const [notification, setNotification] = useState(''); // State for notification message
    const [isDirectoryUpdateModalOpen, setIsDirectoryUpdateModalOpen] = useState(false); // State for directory update modal
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // State for info modal
    const [currentUser, setCurrentUser] = useState(null); // State to store current user details
    const [passwordError, setPasswordError] = useState(''); // State to track password error message
    const [operationData, setOperationData] = useState([]); // State to store machine operation data
    const [lastRefreshTime, setLastRefreshTime] = useState(new Date()); // State to track last refresh time
    const [directoryNumbers, setDirectoryNumbers] = useState([]); // State for directory numbers
    const [newNumberInput, setNewNumberInput] = useState(''); // State for new number input
    const [phoneBook, setPhoneBook] = useState('None'); // New state for PhoneBook

    const handleLogout = () => {
        localStorage.removeItem('username'); // Remove username from local storage
        localStorage.removeItem('name'); // Remove name from local storage
        window.location.href = '/'; // Redirect to login page
    };

    const handleRefresh = () => {
        setNotification('Refreshing data...');
        fetchMachines();
        fetchUserData();
        if (selectedMachineId) {
            const selectedMachine = machines.find(machine => machine._id === selectedMachineId);
            setSelectedMachineDetails(selectedMachine);
            fetchOperationData(selectedMachineId);
        }
        setLastRefreshTime(new Date());
        setNotification('Data refreshed successfully!');
        setTimeout(() => setNotification(''), 3000);
    };

    const openMachineModal = () => {
        setIsMachineModalOpen(true);
    };

    const closeMachineModal = () => {
        setIsMachineModalOpen(false);
        setMachineName('');
        setSimNumber('');
        setRemarks('');
        setOperator(''); // Reset operator
        setOperationArea(''); // Reset operation area
        setPhoneBook('None'); // Reset phoneBook
    };

    const handleAddMachine = async (e) => {
        e.preventDefault();
        const machineData = { 
            machineName, 
            simNumber, 
            remarks, 
            operator, // Include operator in the machine data
            operationArea, // Include operation area in the machine data
            username: localStorage.getItem('username'), // Send the username
            phoneBook, // Include phoneBook in the machine data
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
                setCurrentUser(currentUser); // Store the current user details
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const resetMachineStatuses = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/machines/reset-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // console.log('All machine statuses reset to OFFLINE');
                return true;
            } else {
                console.error('Failed to reset machine statuses');
                return false;
            }
        } catch (error) {
            console.error('Error resetting machine statuses:', error);
            return false;
        }
    };

    useEffect(() => {
        // Immediately-invoked async function to handle all initialization
        (async () => {
            // First, reset all machine statuses to OFFLINE
            await resetMachineStatuses();
            // Then fetch machines and user data
            await fetchMachines();
            await fetchUserData();
            // Update the last refresh time
            setLastRefreshTime(new Date());
        })();
    }, []);

    const handleSelectMachine = (id) => {
        setSelectedMachineId(id); // Set the selected machine ID
        const selectedMachine = machines.find(machine => machine._id === id);
        setSelectedMachineDetails(selectedMachine); // Set the selected machine details
        fetchOperationData(id); // Fetch operation data for the selected machine
    };

    const fetchOperationData = async (machineId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/machines/${machineId}/operations`);
            if (response.ok) {
                const data = await response.json();
                setOperationData(data);
            } else {
                console.error('Failed to fetch operation data');
            }
        } catch (error) {
            console.error('Error fetching operation data:', error);
        }
    };

    const handleDeleteOperation = async (operationId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/operations/${operationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                // Remove the deleted operation from the state
                setOperationData(operationData.filter(operation => operation._id !== operationId));
                setNotification('Operation record deleted successfully!');
                setTimeout(() => setNotification(''), 3000);
            } else {
                const errorMessage = await response.text();
                setNotification(`Failed to delete operation: ${errorMessage}`);
                setTimeout(() => setNotification(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting operation:', error);
            setNotification('Error deleting operation record');
            setTimeout(() => setNotification(''), 3000);
        }
    };

    const openDeleteModal = () => {
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setuserPassword('');
        setPasswordError(''); // Clear any password error when closing the modal
    };

    const handleDeleteMachine = async () => {
        // First check if password is provided
        if (!userPassword) {
            setPasswordError('Please enter your password');
            return;
        }
        
        // Check if password matches with user's password
        if (currentUser && userPassword !== currentUser.password) {
            setPasswordError('Incorrect password');
            return;
        }
        
        // If password is correct, proceed with deletion
        try {
            const response = await fetch(`http://localhost:5000/api/machines/${selectedMachineId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: userPassword, username: localStorage.getItem('username') }), // Send username
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

    const openDirectoryUpdateModal = () => {
        setIsDirectoryUpdateModalOpen(true);
        // Try to fetch directory numbers if a machine is selected
        if (selectedMachineId) {
            fetchDirectoryNumbers();
        }
    };

    const closeDirectoryUpdateModal = () => {
        setIsDirectoryUpdateModalOpen(false);
        // Reset the input when closing modal
        setNewNumberInput('');
    };

    // Functions for Info Modal
    const openInfoModal = () => {
        setIsInfoModalOpen(true);
    };

    const closeInfoModal = () => {
        setIsInfoModalOpen(false);
    };

    const handleDownloadPdf = async () => {
        if (!selectedMachineId) {
            alert('Please select a machine first');
            return;
        }

        // Create a new PDF document
        const doc = new jsPDF();
        
        // Add document title and header
        doc.setFontSize(30);
        // Set font to bold for the title
        doc.setFont(undefined, 'bold');
        doc.text('GK-CAB', 30, 15, { align: 'center' });
        
        doc.setFontSize(17);
        // Keep bold setting for subtitle
        doc.text('JOB REPORT', 105, 40, { align: 'center' });
        
        // Reset to normal font for the rest of the document
        doc.setFont(undefined, 'normal');
        
        // Add the current date and time
        const currentDateTime = new Date();
        doc.setFontSize(10);
        doc.text(`Report Generated: ${formatDate(currentDateTime)}`, 160, 10, { align: 'center' });
        
        // Add the user name who printed the report
        doc.text(`Printed by: ${name}`, 141.5, 15, { align: 'center' });
        
        // Add machine details
        doc.setFontSize(12);
        // doc.text('Machine Details:', 14, 45);
        doc.text(`Machine Name: ${selectedMachineDetails.machineName || 'N/A'}`, 14, 55);
        doc.text(`SIM Number: ${selectedMachineDetails.simNumber || 'N/A'}`, 14, 61);
        doc.text(`Operator: ${selectedMachineDetails.operator || 'N/A'}`, 14, 67);
        doc.text(`Operation Area: ${selectedMachineDetails.operationArea || 'N/A'}`, 14, 73);
        
        // Set starting y-position for the operations table
        let yPosition = 85;
        
        // Add operation data in a table
        doc.setFont(undefined, 'bold');
        doc.setFontSize(13);
        doc.text('OPERATION DATA', 84, yPosition);
        doc.setFont(undefined, 'normal');
        yPosition += 10;
        
        if (operationData && operationData.length > 0) {
            // Column headers for the table
            const headers = [['Date & Time', 'Fuel Consumption', 'Pressure', 'Process Time', 'Location']];
            
            // Table data
            const data = operationData.map(operation => [
                formatDate(operation.dateTime),
                operation.fuelConsumption || 'N/A',
                operation.pressure || 'N/A',
                operation.processTime || 'N/A',
                operation.location || 'N/A'
            ]);
            
            // Generate table using imported autoTable plugin
            autoTable(doc, {
                startY: yPosition,
                head: headers,
                body: data,
                theme: 'striped',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 66, 66] }
            });
        } else {
            doc.text('No operation data available', 14, yPosition + 10);
        }
        
        // Save the PDF with a meaningful filename
        doc.save(`GK-CAB_Job_Report_${selectedMachineDetails.machineName}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleGetStatus = async () => {
        if (!selectedMachineId) {
            alert('Please select a machine first');
            return;
        }

        // Get the SIM number of the selected machine
        const machineDetails = machines.find(m => m._id === selectedMachineId);
        const simNumber = machineDetails ? machineDetails.simNumber : '';
        
        if (!simNumber) {
            alert('Selected machine has no SIM number');
            return;
        }
        
        try {
            // Build the request body with the GET_STATUS command
            let messageBody = 'cmd=get_status';
            messageBody += `&simNumber=${encodeURIComponent(simNumber)}`;
            
            // Send the request to the ESP32 data API to queue the message
            const esp32Response = await fetch(`http://localhost:5000/api/esp32data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: messageBody
            });
            
            if (esp32Response.ok) {
                console.log('Get Status command queued successfully');
                setNotification('Status requested, wait for a few mins...');
                setTimeout(() => setNotification(''), 10000);
            } else {
                console.error('Failed to queue Get Status command');
                setNotification('Failed to queue status request!');
                setTimeout(() => setNotification(''), 3000);
            }
        } catch (error) {
            console.error('Error queuing Get Status command:', error);
            setNotification('Error queuing status request!');
            setTimeout(() => setNotification(''), 3000);
        }
    };

    // Function to add a number to the directory
    const addDirectoryNumber = () => {
        if (newNumberInput.trim() !== '') {
            // Check if we've reached the maximum limit
            if (directoryNumbers.length >= 15) {
                setNotification('Maximum limit of 15 numbers reached!');
                setTimeout(() => setNotification(''), 3000);
                return;
            }
            setDirectoryNumbers([...directoryNumbers, newNumberInput.trim()]);
            setNewNumberInput(''); // Clear input after adding
        }
    };

    // Function to delete a number from the directory
    const deleteDirectoryNumber = (indexToDelete) => {
        setDirectoryNumbers(directoryNumbers.filter((_, index) => index !== indexToDelete));
    };

    // Format date for display
    const formatDate = (dateString) => {
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Function to save directory numbers to the backend
    const saveDirectoryNumbers = async () => {
        if (!selectedMachineId) {
            alert('Please select a machine first');
            return;
        }

        // Check if machine status is ONLINE
        if (selectedMachineDetails.status !== 'ONLINE') {
            alert('Machine OFFLINE: Cannot save directory numbers when machine is offline');
            setNotification('Machine OFFLINE: Cannot save directory numbers');
            setTimeout(() => setNotification(''), 3000);
            return;
        }

        try {
            // Save directory numbers
            const response = await fetch(`http://localhost:5000/api/machines/${selectedMachineId}/directory-numbers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ directoryNumbers })
            });

            if (response.ok) {
                // Send message to ESP32 device
                try {
                    // Get the SIM number of the selected machine
                    const machineDetails = machines.find(m => m._id === selectedMachineId);
                    const simNumber = machineDetails ? machineDetails.simNumber : '';
                    
                    // Build the request body - include the command, count and directory numbers
                    let messageBody = 'cmd=dir_update';
                    
                    // Add count of directory numbers
                    messageBody += `&count=${directoryNumbers.length}`;
                    
                    // Add each directory number
                    directoryNumbers.forEach((number, index) => {
                        messageBody += `&number${index + 1}=${encodeURIComponent(number)}`;
                    });
                    
                    // Add the SIM number if available
                    if (simNumber) {
                        messageBody += `&simNumber=${encodeURIComponent(simNumber)}`;
                    }
                    
                    const esp32Response = await fetch(`http://localhost:5000/api/esp32data`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: messageBody
                    });
                    
                    if (esp32Response.ok) {
                        console.log('Message sent to ESP32 device successfully');
                    } else {
                        console.error('Failed to send message to ESP32 device');
                    }
                } catch (esp32Error) {
                    console.error('Error sending message to ESP32:', esp32Error);
                }
                
                alert('Directory numbers saved successfully');
                setNotification('Directory numbers saved successfully!');
                setTimeout(() => setNotification(''), 3000);
            } else {
                alert('Failed to save directory numbers');
                setNotification('Failed to save directory numbers');
                setTimeout(() => setNotification(''), 3000);
            }
        } catch (error) {
            console.error('Error saving directory numbers:', error);
            alert('Error saving directory numbers');
        }
    };

    // Function to fetch directory numbers from the backend
    const fetchDirectoryNumbers = async () => {
        if (!selectedMachineId) {
            alert('Please select a machine first');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/machines/${selectedMachineId}/directory-numbers`);
            const data = await response.json();
            
            setDirectoryNumbers(data.directoryNumbers || []);
        } catch (error) {
            console.error('Error fetching directory numbers:', error);
            alert('Error fetching directory numbers');
        }
    };

    return (
        <div className="user-dashboard-container">
            <h1 className="dashboard-heading">GK-CAB</h1>
            <h2 className="sub-heading">DATA PORTAL</h2>
            <h2 className="greeting">Hello, {name}</h2>
            <div className="header-buttons">
                <button className="refresh-button" onClick={handleRefresh}>Refresh</button>
                <div className="last-refresh">
                    <small>Last refreshed: {formatDate(lastRefreshTime)}</small>
                </div>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>

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
                                    backgroundColor: selectedMachineId === machine._id ? '#0091d5' : '#7e909a', // Update: darker blue when selected, lighter blue when not
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
                                <button className="delete-machine-button" onClick={openDeleteModal} style={{ position: 'absolute', top: 10, right: 10 }}>Delete Machine</button>
                                <button className="download-button" onClick={handleDownloadPdf} style={{ position: 'absolute', top: 10, right: 130 }}>Download</button>
                                <button className="directory-update-button" onClick={openDirectoryUpdateModal} style={{ position: 'absolute', top: -25, right: 100 }}>Directory Update</button> {/* New Directory Update button */}
                                <button className="get-status-button" onClick={handleGetStatus} style={{ position: 'absolute', top: -25, right: 10 }}>Get Status</button> {/* New Get Status button */}
                                <button className="info-button" onClick={openInfoModal} style={{ position: 'absolute', top: -25, right: 228 }}>Info</button> {/* Info button with click handler */}
                                {/* <button className="get-status-button" onClick={handleDownloadPdf} style={{ position: 'absolute', top: -25, right: 10 }}>Download PDF</button> New Download PDF button */}
                                <button className="info-button" onClick={openInfoModal} style={{ position: 'absolute', top: -25, right: 228 }}>Info</button> {/* Info button with click handler */}
                                <p><strong>Machine Name:</strong> {selectedMachineDetails.machineName}</p>
                                <p><strong>SIM Number:</strong> {selectedMachineDetails.simNumber}</p>
                                <p>
                                    <strong>Status:</strong>{' '}
                                    <span style={{ 
                                        fontWeight: 'bold',
                                        color: selectedMachineDetails.status === 'ONLINE' ? '#008000' : '#cf1313'
                                    }}>
                                        {selectedMachineDetails.status || 'OFFLINE'}
                                    </span>
                                </p>
                                <p><strong>Last Status Update:</strong> {selectedMachineDetails.lastStatusUpdate ? formatDate(selectedMachineDetails.lastStatusUpdate) : 'Never'}</p>
                            </div>
                        )}
                    </div>
                    <hr className="horizontal-divider" /> {/* Horizontal divider */}
                    <div className="right_down">
                        {selectedMachineId ? (
                            <div className="operation-data-container">
                                {/* <h3>Operation Data</h3> */}
                                {selectedMachineDetails.serverConnection === 'ONLINE' ? (
                                    <div className="table-container">
                                        <table className="operation-table">
                                            <thead>
                                                <tr>
                                                    <th>Date-Time</th>
                                                    <th>Fuel Consumption (ml)</th>
                                                    <th>Pressure (bar)</th>
                                                    <th>Process Time (sec)</th>
                                                    <th>Location</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {operationData.length > 0 ? (
                                                    operationData.map((operation) => (
                                                        <tr key={operation._id}>
                                                            <td>{formatDate(operation.dateTime)}</td>
                                                            <td>{operation.fuelConsumption}</td>
                                                            <td>{operation.pressure}</td>
                                                            <td>{operation.processTime}</td>
                                                            <td>{operation.location}</td>
                                                            <td>
                                                                <button 
                                                                    className="delete-operation-button"
                                                                    onClick={() => handleDeleteOperation(operation._id)}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="6" style={{ textAlign: 'center' }}>No operation data available</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginTop: '20px', color: '#cf1313' }}>
                                        Server Connection: OFFLINE
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p>Select a machine to view operation data</p>
                        )}
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
                            <input
                                type="text"
                                placeholder="Operator"
                                value={operator}
                                onChange={(e) => setOperator(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Operation Area"
                                value={operationArea}
                                onChange={(e) => setOperationArea(e.target.value)}
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
                            placeholder="User Password"
                            value={userPassword}
                            onChange={(e) => setuserPassword(e.target.value)}
                            required
                        />
                        {passwordError && <p className="error-message" style={{ color: 'red' }}>{passwordError}</p>}
                        <button onClick={handleDeleteMachine}>Delete Machine</button>
                        <button onClick={closeDeleteModal}>Cancel</button>
                    </div>
                </div>
            )}

            {isDirectoryUpdateModalOpen && (
                <div className="modal_dir">
                    <div className="modal_dir-content">
                        <span className="close-button" onClick={closeDirectoryUpdateModal}>&times;</span>
                        <h3>Directory Update</h3>
                        {selectedMachineId ? (
                            <>
                                <p>
                                    Machine: {machines.find(m => m._id === selectedMachineId)?.machineName || 'Unknown'}
                                </p>
                                <p>
                                    Status: <span style={{ 
                                        fontWeight: 'bold',
                                        color: selectedMachineDetails.status === 'ONLINE' ? '#008000' : '#cf1313'
                                    }}>
                                        {selectedMachineDetails.status || 'OFFLINE'}
                                    </span>
                                    {selectedMachineDetails.status !== 'ONLINE' && 
                                        <span style={{ color: '#cf1313', display: 'block', marginTop: '5px' }}>
                                            (Machine must be ONLINE to save directory)
                                        </span>
                                    }
                                </p>
                            </>
                        ) : (
                            <p style={{ color: 'red' }}>Please select a machine first!</p>
                        )}
                        
                        {/* <p style={{ color: '#666', fontStyle: 'italic' }}>Maximum 15 phone numbers allowed.</p> */}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {/* Left Section */}
                            <div style={{ width: '30%', padding: '10px' }}>
                                {/* <h4>Directory Controls</h4> */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* <button 
                                        style={{ padding: '8px', cursor: 'pointer' }}
                                        onClick={fetchDirectoryNumbers}
                                    >
                                        Get Directory
                                    </button> */}
                                    
                                    {/* Add Number button and input */}
                                    <div style={{ marginTop: '15px' }}>
                                        {/* <h4>Add Number</h4> */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
                                            <input 
                                                type="text" 
                                                value={newNumberInput}
                                                onChange={(e) => setNewNumberInput(e.target.value)}
                                                placeholder="+91XXXXXXXXXX"
                                                style={{ padding: '8px', width: '90%' }}
                                            />
                                            <button 
                                                style={{ 
                                                    padding: '8px', 
                                                    backgroundColor: '#1e434c',
                                                    cursor: directoryNumbers.length >= 15 ? 'not-allowed' : 'pointer',
                                                    opacity: directoryNumbers.length >= 15 ? 0.6 : 1
                                                }}
                                                onClick={addDirectoryNumber}
                                                disabled={directoryNumbers.length >= 15}
                                            >
                                                Add Number
                                            </button>
                                            {directoryNumbers.length >= 15 && (
                                                <p style={{ color: 'red', margin: '5px 0', fontSize: '0.8em' }}>
                                                    Maximum limit reached!
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Right Section */}
                            <div style={{ width: '65%', padding: '10px' }}>
                                {/* <h4>Directory Data</h4> */}
                                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                                    <table style={{ width: '80%', borderCollapse: 'collapse' }}>
                                        <thead style={{ position: 'sticky', top: '0', backgroundColor: 'white', zIndex: '1' }}>
                                            <tr>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Numbers</th>
                                                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {directoryNumbers.length > 0 ? (
                                                directoryNumbers.map((number, index) => (
                                                    <tr key={index}>
                                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{number}</td>
                                                        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                            <button 
                                                                style={{ 
                                                                    padding: '5px 10px', 
                                                                    backgroundColor: '#cf1313', 
                                                                    color: 'white', 
                                                                    border: 'none', 
                                                                    borderRadius: '3px',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => deleteDirectoryNumber(index)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>No data available</td>
                                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>-</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '20px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button 
                                style={{ 
                                    padding: '8px 15px', 
                                    backgroundColor: selectedMachineDetails.status === 'ONLINE' ? '#1e434c' : '#cccccc', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '4px',
                                    cursor: selectedMachineDetails.status === 'ONLINE' ? 'pointer' : 'not-allowed'
                                }}
                                onClick={saveDirectoryNumbers}
                                title={selectedMachineDetails.status !== 'ONLINE' ? 'Machine must be ONLINE to save directory' : ''}
                            >
                                Save Directory
                            </button>
                            <button 
                                style={{ 
                                    padding: '8px 15px',
                                    cursor: 'pointer',
                                    backgroundColor: '#1e434c',
                                }}
                                onClick={closeDirectoryUpdateModal}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isInfoModalOpen && (
                <div className="modal_info">
                    <div className="modal-content_info">
                        <span className="close-button" onClick={closeInfoModal}>&times;</span>
                        <h3>Machine Details</h3>
                        {selectedMachineId && (
                            <div>
                                <p><strong>Machine Name:</strong> {selectedMachineDetails.machineName}</p>
                                <p><strong>SIM Number:</strong> {selectedMachineDetails.simNumber}</p>
                                <p>
                                    <strong>Status:</strong>{' '}
                                    <span style={{ 
                                        fontWeight: 'bold',
                                        color: selectedMachineDetails.status === 'ONLINE' ? '#008000' : '#cf1313'
                                    }}>
                                        {selectedMachineDetails.status || 'OFFLINE'}
                                    </span>
                                </p>
                                <p><strong>Sensor Status:</strong> {selectedMachineDetails.sensorStatus || 'None'}</p>
                                <p><strong>Location:</strong> {selectedMachineDetails.location || 'None'}</p>
                                <p><strong>Server Connection:</strong> {selectedMachineDetails.serverConnection || 'OFFLINE'}</p>
                                <p><strong>Operator:</strong> {selectedMachineDetails.operator || 'None'}</p>
                                <p><strong>Operation Area:</strong> {selectedMachineDetails.operationArea || 'None'}</p>
                                <p><strong>Remarks:</strong> {selectedMachineDetails.remarks}</p>
                                <p><strong>Last Status Update:</strong> {selectedMachineDetails.lastStatusUpdate ? formatDate(selectedMachineDetails.lastStatusUpdate) : 'Never'}</p>
                                <p><strong>PhoneBook:</strong></p>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                                    {Array.isArray(selectedMachineDetails.phoneBook) && selectedMachineDetails.phoneBook.length > 0 
                                        ? selectedMachineDetails.phoneBook
                                            .filter(number => number && number.trim() !== '')
                                            .map((number, index) => (
                                                <p key={index} style={{ margin: '5px 0' }}>{number}</p>
                                            ))
                                        : <p>No phone numbers available</p>
                                    }
                                </div>
                            </div>
                        )}
                        <div style={{ textAlign: 'right', marginTop: '20px' }}>
                            <button onClick={closeInfoModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {notification && <div className="notification">{notification}</div>} {/* Notification */}
        </div>
    );
};

export default UserDashboard; 