#include <SoftwareSerial.h>
SoftwareSerial sim(2, 3); // RX on pin 2 and TX on pin 3
int _timeout; // Declare a variable to track timeout during serial communication
String _buffer; // Declare a string buffer to store received data from the GSM module
String number = "+919425111787";

void setup() {
  delay(7000); 
  Serial.begin(9600);
  _buffer.reserve(50); // Allocate 50 bytes of memory for the _buffer string to optimize memory usage
  Serial.println("Sistem Started..."); 
  sim.begin(9600); 
  delay(1000); // Wait for 1 second to allow the GSM module to initialize
  Serial.println("READY"); 
}

void loop() {
  if (Serial.available() > 0) // Check if data is available to read from the serial monitor
    switch (Serial.read()) // Read the incoming byte and use it in a switch statement
    {
      case 's': 
        SendMessage();
        break;
      case 'r':
        RecieveMessage();
        break;
    }
  if (sim.available() > 0) // Check if data is available to read from the GSM module
    Serial.write(sim.read()); // Forward any data from the GSM module to the serial monitor
}

void SendMessage()
{
  sim.println("AT+CMGF=1"); // Send AT command to set the GSM module to SMS text mode
  delay(200); // Wait 200ms for the GSM module to process the command
  sim.println("AT+CMGS=\"" + number + "\"\r"); // Send AT command to specify the recipient's phone number
  delay(200); // Wait 200ms for the GSM module to process the command
  String SMS = "Test Message"; // Define the message content to send
  sim.println(SMS); // Send the SMS message content to the GSM module
  delay(100); // Wait 100ms for the GSM module to process the command
  sim.println((char)26); // Send the ASCII code for Ctrl+Z which indicates the end of the SMS
  delay(200); // Wait 200ms for the GSM module to process the command
  _buffer = _readSerial(); // Read and store the response from the GSM module
}

void RecieveMessage()
{
  Serial.println ("SIM800L Read an SMS");
  sim.println("AT+CMGF=1"); // Send AT command to set the GSM module to SMS text mode
  delay (200); // Wait 200ms for the GSM module to process the command
  sim.println("AT+CNMI=1,2,0,0,0"); // Send AT command to configure the GSM module to output SMS messages directly to serial
  delay(200); // Wait 200ms for the GSM module to process the command
  Serial.write ("Unread Message done"); 
}

String _readSerial() {
  _timeout = 0; // Reset the timeout counter
  while  (!sim.available() && _timeout < 12000) // Wait until data is available or timeout is reached (approx. 156 seconds)
  {
    delay(13); // Wait 13ms between checks
    _timeout++; // Increment the timeout counter
  }
  if (sim.available()) { // If data is available from the GSM module
    return sim.readString(); // Read all available data as a string and return it
  }
}