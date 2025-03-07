/*
  ESP32 with SIM800L Data Receiver
  
  This script connects to a server and retrieves data in application/x-www-form-urlencoded format,
  then displays it on the serial monitor.
  
  Based on code by Rui Santos (https://RandomNerdTutorials.com)
*/

// Your GPRS credentials (leave empty, if not needed)
const char apn[]      = "airtelgprs.com"; // APN (example: internet.vodafone.pt) use https://wiki.apnchanger.org
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

#define uS_TO_S_FACTOR 1000000UL   /* Conversion factor for micro seconds to seconds */
#define TIME_TO_SLEEP  60         /* Time ESP32 will go to sleep (in seconds) */

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

void setup() {
  // Set serial monitor debugging window baud rate to 115200
  SerialMon.begin(115200);

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

  // Configure the wake up source as timer wake up  
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
}

// ... existing code ...
void loop() {
  SerialMon.print("Connecting to APN: ");
  SerialMon.print(apn);
  if (!modem.gprsConnect(apn, gprsUser, gprsPass)) {
    SerialMon.println(" fail");
  }
  else {
    SerialMon.println(" OK");
    
    SerialMon.print("Connecting to ");
    SerialMon.print(server);
    if (!client.connect(server, port)) {
      SerialMon.println(" fail");
    }
    else {
      SerialMon.println(" OK");
    
      // Making an HTTP GET request
      SerialMon.println("Performing HTTP GET request...");
      
      // Create a query string to identify this device
      // Get data specific to this device by including its SIM number
      String simNumber = "default"; // Replace with your actual SIM number if needed
      String queryString = "?simNumber=" + simNumber;
      
      client.print(String("GET ") + resource + queryString + " HTTP/1.1\r\n");
      client.print(String("Host: ") + server + "\r\n");
      client.println("Connection: close");
      client.println();
      
      SerialMon.println("Waiting for server response...");
      
      // Variables to store response
      bool headerComplete = false;
      String responseBody = "";
      
      unsigned long timeout = millis();
      while (client.connected() && millis() - timeout < 10000L) {
        // Print available data (HTTP response from server)
        while (client.available()) {
          String line = client.readStringUntil('\n');
          
          // Check for end of headers
          if (!headerComplete && line == "\r") {
            headerComplete = true;
            SerialMon.println("Headers received, reading data:");
            continue;
          }
          
          // Once headers are complete, store the response body
          if (headerComplete) {
            responseBody += line + "\n";
          } else {
            // Print header information
            SerialMon.println("HEADER: " + line);
          }
          
          timeout = millis();
        }
      }
      
      SerialMon.println("\n----- Server Data: -----");
      if (responseBody.length() > 0) {
        SerialMon.println(responseBody);
        
        // Check if we have messages or a no_messages status
        if (responseBody.indexOf("status=no_messages") >= 0) {
          SerialMon.println("No new messages available");
        } else {
          // Parse the x-www-form-urlencoded data
          parseFormData(responseBody);
        }
      } else {
        SerialMon.println("No data received or response was empty");
      }
      SerialMon.println("-------------------------\n");
    
      // Close client and disconnect
      client.stop();
      SerialMon.println(F("Server disconnected"));
      modem.gprsDisconnect();
      SerialMon.println(F("GPRS disconnected"));
    }
  }
  // Put ESP32 into deep sleep mode (with timer wake up)
  SerialMon.println("Going to sleep for " + String(TIME_TO_SLEEP) + " seconds");
  esp_deep_sleep_start();
}
// ... existing code ...

// Function to parse application/x-www-form-urlencoded data
void parseFormData(String data) {
  SerialMon.println("\n----- Parsed Data: -----");
  
  // Remove any whitespace
  data.trim();
  
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
      
      // Print parsed key-value pair
      SerialMon.println(key + ": " + value);
    }
    
    start = end + 1;
    end = data.indexOf('&', start);
  }
  SerialMon.println("-------------------------");
}