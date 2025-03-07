/*
  ESP32 with SIM800L Server Communication
  
  This script connects to a server, continuously checks for data, and responds accordingly:
  - If cmd=dir_update is received, it updates the phone directory
  - If cmd=get_status is received, it sends a status update
  
  Based on code by Rui Santos (https://RandomNerdTutorials.com)
*/

// Your GPRS credentials (leave empty, if not needed)
const char apn[]      = "airtelgprs.com"; // APN
const char gprsUser[] = ""; // GPRS User
const char gprsPass[] = ""; // GPRS Password

// SIM card PIN (leave empty, if not defined)
const char simPIN[]   = ""; 

// Server details
const char server[] = "api.bdynamics.in"; // domain name
const char resource[] = "/api/esp32data";  // resource path
const int  port = 80;                      // server port number

// TTGO T-Call pins
#define MODEM_RST            5
#define MODEM_PWKEY          4
#define MODEM_POWER_ON       23
#define MODEM_TX             27
#define MODEM_RX             26
#define I2C_SDA              21
#define I2C_SCL              22
// BME280 pins
#define I2C_SDA_2            18
#define I2C_SCL_2            19

// Set serial for debug console (to Serial Monitor, default speed 115200)
#define SerialMon Serial
// Set serial for AT commands (to SIM800 module)
#define SerialAT Serial1

// Define the phoneBook array with initial values
String phoneBook[] = {"+919826951787", "+919425401434", "+919425111787"};

// Function to display the phonebook
void displayPhoneBook(const char* message) {
  SerialMon.println("\n----- " + String(message) + " -----");
  SerialMon.print("PhoneBook: [ ");
  bool first = true;
  for (int i = 0; i < sizeof(phoneBook)/sizeof(phoneBook[0]); i++) {
    // Skip empty entries
    if (phoneBook[i].length() > 0) {
      if (!first) {
        SerialMon.print(", ");
      }
      SerialMon.print("\"" + phoneBook[i] + "\"");
      first = false;
    }
  }
  SerialMon.println(" ]");
  SerialMon.println("-------------------------");
}

// Configure TinyGSM library
#define TINY_GSM_MODEM_SIM800      // Modem is SIM800
#define TINY_GSM_RX_BUFFER   1024  // Set RX buffer to 1Kb

// Define the serial console for debug prints, if needed
// #define DUMP_AT_COMMANDS

#include <Wire.h>
#include <TinyGsmClient.h>

#ifdef DUMP_AT_COMMANDS
  #include <StreamDebugger.h>
  StreamDebugger debugger(SerialAT, SerialMon);
  TinyGsm modem(debugger);
#else
  TinyGsm modem(SerialAT);
#endif

// I2C for SIM800 (to keep it running when powered from battery)
TwoWire I2CPower = TwoWire(0);

// TinyGSM Client for Internet connection
TinyGsmClient client(modem);

#define IP5306_ADDR          0x75
#define IP5306_REG_SYS_CTL0  0x00

bool setPowerBoostKeepOn(int en){
  I2CPower.beginTransmission(IP5306_ADDR);
  I2CPower.write(IP5306_REG_SYS_CTL0);
  if (en) {
    I2CPower.write(0x37); // Set bit1: 1 enable 0 disable boost keep on
  } else {
    I2CPower.write(0x35); // 0x37 is default reg value
  }
  return I2CPower.endTransmission() == 0;
}

// Variables to track connection state
bool isConnected = false;
bool isClientConnected = false;

void setup() {
  // Set serial monitor debugging window baud rate to 115200
  SerialMon.begin(115200);
  
  // Display initial phonebook contents
  displayPhoneBook("Initial PhoneBook Contents");

  // Start I2C communication
  I2CPower.begin(I2C_SDA, I2C_SCL, 400000);

  // Keep power when running from battery
  bool isOk = setPowerBoostKeepOn(1);
  SerialMon.println(String("IP5306 KeepOn ") + (isOk ? "OK" : "FAIL"));

  // Set modem reset, enable, power pins
  pinMode(MODEM_PWKEY, OUTPUT);
  pinMode(MODEM_RST, OUTPUT);
  pinMode(MODEM_POWER_ON, OUTPUT);
  digitalWrite(MODEM_PWKEY, LOW);
  digitalWrite(MODEM_RST, HIGH);
  digitalWrite(MODEM_POWER_ON, HIGH);

  // Set GSM module baud rate and UART pins
  SerialAT.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
  delay(3000);

  // Restart SIM800 module
  SerialMon.println("Initializing modem...");
  modem.restart();
  // use modem.init() if you don't need the complete restart

  // Unlock your SIM card with a PIN if needed
  if (strlen(simPIN) && modem.getSimStatus() != 3 ) {
    modem.simUnlock(simPIN);
  }
}

void loop() {
  // Check if connected to GPRS
  if (!isConnected) {
    SerialMon.print("Connecting to APN: ");
    SerialMon.print(apn);
    if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
      SerialMon.println(" fail");
      delay(1000);
      return;
    }
    else {
      SerialMon.println(" OK");
      isConnected = true;
    }
  }
  
  // Check if connected to server
  if (!isClientConnected) {
    SerialMon.print("Connecting to ");
    SerialMon.print(server);
    if (!client.connect(server, port)) {
      SerialMon.println(" fail");
      isConnected = false; // Try reconnecting to GPRS next time
      delay(1000);
      return;
    }
    else {
      SerialMon.println(" OK");
      isClientConnected = true;
    }
  }
  
  // Check for data from server
  checkServerData();
  
  // Wait 1 second before next check
  delay(1000);
}

void checkServerData() {
  // Create a query string to identify this device
  String simNumber = "9826951787"; // Replace with your actual SIM number if needed
  String queryString = "?simNumber=" + simNumber;
  
  // Making an HTTP GET request
  SerialMon.println("Checking for data from server...");
  
  client.print(String("GET ") + resource + queryString + " HTTP/1.1\r\n");
  client.print(String("Host: ") + server + "\r\n");
  client.println("Connection: keep-alive");
  client.println();
  
  // Variables to store response
  bool headerComplete = false;
  String responseBody = "";
  
  unsigned long timeout = millis();
  while (client.connected() && millis() - timeout < 5000L) {
    // Print available data (HTTP response from server)
    while (client.available()) {
      String line = client.readStringUntil('\n');
      
      // Check for end of headers
      if (!headerComplete && line == "\r") {
        headerComplete = true;
        continue;
      }
      
      // Once headers are complete, store the response body
      if (headerComplete) {
        responseBody += line + "\n";
      }
      
      timeout = millis();
    }
  }
  
  // Check if the connection is still alive
  if (!client.connected()) {
    SerialMon.println("Connection lost, will reconnect on next loop");
    isClientConnected = false;
    return;
  }
  
  // Process the response if we received any data
  if (responseBody.length() > 0) {
    SerialMon.println("\n----- Server Data: -----");
    SerialMon.println(responseBody);
    
    // Check if we have messages or a no_messages status
    if (responseBody.indexOf("status=no_messages") >= 0) {
      SerialMon.println("No new messages available");
    } else {
      // Parse the data to check for commands
      parseFormData(responseBody);
    }
    SerialMon.println("-------------------------\n");
  } else {
    SerialMon.println("No data received or response was empty");
  }
}

// Function to send status update to server
void sendStatusUpdate() {
  SerialMon.println("Sending status update to server...");
  
  // Build the basic request data
  String httpRequestData = "cmd=STATUS_UPDATE&simNumber=9826951787&status=ONLINE&sensorStatus=OK&location=Bangalore";
  
  // Add phonebook data to the request
  httpRequestData += "&phoneBook=[";
  for (int i = 0; i < sizeof(phoneBook)/sizeof(phoneBook[0]); i++) {
    httpRequestData += "\"" + phoneBook[i] + "\"";
    if (i < sizeof(phoneBook)/sizeof(phoneBook[0]) - 1) {
      httpRequestData += ",";
    }
  }
  httpRequestData += "]";
  
  // For debugging - print the full request data
  SerialMon.println("Request data: " + httpRequestData);
  
  // Send the POST request
  client.print(String("POST ") + resource + " HTTP/1.1\r\n");
  client.print(String("Host: ") + server + "\r\n");
  client.println("Connection: keep-alive");
  client.println("Content-Type: application/x-www-form-urlencoded");
  client.print("Content-Length: ");
  client.println(httpRequestData.length());
  client.println();
  client.println(httpRequestData);
  
  // Read and print the response
  unsigned long timeout = millis();
  bool headerComplete = false;
  
  while (client.connected() && millis() - timeout < 5000L) {
    // Print available data (HTTP response from server)
    while (client.available()) {
      String line = client.readStringUntil('\n');
      
      // Skip headers to avoid cluttering the output
      if (!headerComplete && line == "\r") {
        headerComplete = true;
        continue;
      }
      
      if (headerComplete) {
        SerialMon.println(line);
      }
      
      timeout = millis();
    }
  }
  
  SerialMon.println("Status update completed");
}

// Function to parse application/x-www-form-urlencoded data
void parseFormData(String data) {
  SerialMon.println("\n----- Parsing Data: -----");
  
  // Remove any whitespace
  data.trim();
  
  // Array to store directory numbers (maximum 10 numbers)
  String directoryNumbers[10];
  int numberCount = 0;
  
  // Flag to track if we found get_status command
  bool isGetStatusCommand = false;
  
  // Flag to track if we found dir_update command
  bool isDirUpdateCommand = false;
  int directoryCount = 0;
  
  // Split by '&' to get key-value pairs
  int start = 0;
  int end = data.indexOf('&', start);
  
  while (start < data.length()) {
    if (end == -1) {
      end = data.length();
    }
    
    String keyValue = data.substring(start, end);
    int separatorPos = keyValue.indexOf('=');
    
    if (separatorPos != -1) {
      String key = keyValue.substring(0, separatorPos);
      String value = keyValue.substring(separatorPos + 1);
      
      // URL decode the value if needed
      value.replace("+", " ");
      
      SerialMon.println(key + ": " + value);
      
      // Check for get_status command
      if (key == "cmd" && value == "get_status") {
        isGetStatusCommand = true;
        SerialMon.println("\n----- GET STATUS COMMAND RECEIVED -----");
      }
      
      // Check for dir_update command
      if (key == "cmd" && value == "dir_update") {
        isDirUpdateCommand = true;
        SerialMon.println("\n----- DIRECTORY UPDATE COMMAND RECEIVED -----");
      }
      
      // If we've found a dir_update command, look for count and number values
      if (isDirUpdateCommand) {
        if (key == "count") {
          directoryCount = value.toInt();
          SerialMon.println("Directory Count: " + value);
        } else if (key.startsWith("number") && key.length() > 6) {
          // Extract the number index from keys like "number1", "number2", etc.
          int index = key.substring(6).toInt() - 1; // Subtract 1 for 0-based array
          if (index >= 0 && index < 10) { // Limit to 10 numbers
            directoryNumbers[index] = value;
            if (index >= numberCount) {
              numberCount = index + 1;
            }
            SerialMon.println("Number " + String(index + 1) + ": " + value);
          }
        }
      }
      
      // Check if this is a message parameter that contains nested form data
      if (key.startsWith("message") && value.indexOf("%3D") >= 0) {
        SerialMon.println("Found nested message, decoding...");
        
        // URL decode the value
        String decodedValue = urlDecode(value);
        SerialMon.println("Decoded message: " + decodedValue);
        
        // Check if decoded message contains get_status command
        if (decodedValue.indexOf("cmd=get_status") >= 0) {
          isGetStatusCommand = true;
          SerialMon.println("\n----- GET STATUS COMMAND RECEIVED -----");
        }
        
        // Check if this contains a directory update
        if (decodedValue.indexOf("cmd=dir_update") >= 0) {
          SerialMon.println("\n----- Directory Update Found -----");
          isDirUpdateCommand = true;
          
          // Extract the count
          int countStart = decodedValue.indexOf("count=") + 6;
          int countEnd = decodedValue.indexOf("&", countStart);
          if (countEnd == -1) countEnd = decodedValue.length();
          
          String countStr = decodedValue.substring(countStart, countEnd);
          int count = countStr.toInt();
          SerialMon.println("Directory Count: " + countStr);
          
          // Extract each number
          for (int i = 1; i <= count && i <= 10; i++) {
            String numberKey = "number" + String(i) + "=";
            int numberStart = decodedValue.indexOf(numberKey) + numberKey.length();
            
            if (numberStart > numberKey.length()) {  // Found the number
              int numberEnd = decodedValue.indexOf("&", numberStart);
              if (numberEnd == -1) numberEnd = decodedValue.length();
              
              // Store the number in the array
              directoryNumbers[numberCount] = decodedValue.substring(numberStart, numberEnd);
              numberCount++;
              
              SerialMon.println("Number " + String(i) + ": " + directoryNumbers[numberCount-1]);
            }
          }
        }
      }
    }
    
    start = end + 1;
    end = data.indexOf('&', start);
  }
  
  // Update phonebook if directory numbers were received
  if (isDirUpdateCommand && numberCount > 0) {
    SerialMon.println("\n----- Directory Numbers Array -----");
    SerialMon.print("[ ");
    for (int i = 0; i < numberCount; i++) {
      SerialMon.print("\"" + directoryNumbers[i] + "\"");
      if (i < numberCount - 1) {
        SerialMon.print(", ");
      }
    }
    SerialMon.println(" ]");
    
    // Clear the existing phoneBook by setting all elements to empty strings
    for (int i = 0; i < sizeof(phoneBook)/sizeof(phoneBook[0]); i++) {
      phoneBook[i] = "";
    }
    
    // Copy the new numbers to the phoneBook array
    for (int i = 0; i < numberCount && i < sizeof(phoneBook)/sizeof(phoneBook[0]); i++) {
      phoneBook[i] = directoryNumbers[i];
    }
    
    // Display the updated phoneBook
    displayPhoneBook("Updated PhoneBook Contents");
    sendStatusUpdate();
  }
  
  // Send status update if get_status command was received
  if (isGetStatusCommand) {
    SerialMon.println("\nResponding to GET STATUS command...");
    sendStatusUpdate();
  }
  
  SerialMon.println("-------------------------");
}

// Helper function to decode URL encoded strings
String urlDecode(String input) {
  String output = "";
  
  for (int i = 0; i < input.length(); i++) {
    if (input[i] == '%') {
      if (i+2 < input.length()) {
        char high = input[i+1];
        char low = input[i+2];
        
        if (high == '3' && low == 'D') {
          output += '=';
        } else if (high == '2' && low == '6') {
          output += '&';
        } else if (high == '2' && low == 'B') {
          output += '+';
        } else {
          // Handle other hex values as needed
          output += '%';
          output += high;
          output += low;
        }
        i += 2;
      }
    } else {
      output += input[i];
    }
  }
  
  return output;
} 