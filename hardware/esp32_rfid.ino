#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <MFRC522.h>
#include <SPI.h>

// ===== RFID =====
#define SS_PIN 5
#define RST_PIN 2

MFRC522 rfid(SS_PIN, RST_PIN);

// ===== LCD =====
LiquidCrystal_I2C lcd(0x3F, 16, 2);

// ===== WiFis =====
const char* ssids[] = {"WIFI_ESCOLA", "WIFI_RESERVA"};
const char* passwords[] = {"SENHA_AQUI", "SENHA_AQUI"};

const int wifiCount = 2;

// ===== Servidor local =====
const char* serverBaseURL = "http://SEU_IP_LOCAL:3000"; // TROCA PELO IP DO NOTEBOOK
String presencaURL = String(serverBaseURL) + "/api/presenca";
String resetURL    = String(serverBaseURL) + "/api/reset-presencas";
String horaURL     = String(serverBaseURL) + "/api/hora";

// ===== Controle de reset =====
bool reset11 = false;
bool reset17 = false;
bool reset23 = false;
String ultimaDataReset = "";

// =====================================================
// HELPERS
// =====================================================
void mostrarTelaInicial() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CETEP/LNAB");
  lcd.setCursor(0, 1);
  lcd.print("Identifique-se");
}

String extrairCampoJson(String json, String campo) {
  String chave = "\"" + campo + "\":";
  int inicio = json.indexOf(chave);

  if (inicio < 0) return "";

  inicio += chave.length();

  // pula espaços
  while (inicio < json.length() && (json[inicio] == ' ')) {
    inicio++;
  }

  // se for string
  if (inicio < json.length() && json[inicio] == '\"') {
    inicio++;
    int fim = json.indexOf("\"", inicio);
    if (fim < 0) return "";
    return json.substring(inicio, fim);
  }

  // se for número
  int fim = inicio;
  while (fim < json.length() && json[fim] != ',' && json[fim] != '}') {
    fim++;
  }

  return json.substring(inicio, fim);
}

void conectarWifi() {
  lcd.clear();
  lcd.print("Conectando WiFi");

  WiFi.mode(WIFI_STA);

  for (int i = 0; i < wifiCount; i++) {
    WiFi.disconnect(true, true);
    delay(1000);

    Serial.println("Tentando WiFi: " + String(ssids[i]));
    WiFi.begin(ssids[i], passwords[i]);

    int tentativas = 0;
    while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
      delay(500);
      Serial.print(".");
      tentativas++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nConectado ao WiFi!");
      Serial.print("IP do ESP: ");
      Serial.println(WiFi.localIP());

      lcd.clear();
      lcd.print("WiFi conectado!");
      delay(1200);
      return;
    }
  }

  Serial.println("\nNenhum WiFi conectado!");
  lcd.clear();
  lcd.print("WiFi falhou!");
  delay(1500);
}

bool garantirWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.println("WiFi caiu. Reconectando...");
  conectarWifi();
  return WiFi.status() == WL_CONNECTED;
}

// =====================================================
// PEGAR HORA DO NOTEBOOK
// =====================================================
bool obterDataHoraServidor(String &dataHoje, String &horaAtual, int &horaNum, int &minNum) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(horaURL);

  int httpCode = http.GET();
  String resposta = http.getString();

  Serial.println("GET /api/hora");
  Serial.println("HTTP Code: " + String(httpCode));
  Serial.println("Resposta hora: " + resposta);

  if (httpCode != 200) {
    http.end();
    return false;
  }

  dataHoje = extrairCampoJson(resposta, "data");
  horaAtual = extrairCampoJson(resposta, "hora");
  horaNum = extrairCampoJson(resposta, "horaNum").toInt();
  minNum = extrairCampoJson(resposta, "minNum").toInt();

  http.end();
  return true;
}

// =====================================================
// ENVIO DE PRESENCA
// =====================================================
bool enviarPresencaLocal(
  String uid,
  String dataHoje,
  String horario,
  String &nomeRecebido,
  String &cursoRecebido,
  String &acaoRecebida,
  String &mensagemErro
) {
  if (WiFi.status() != WL_CONNECTED) {
    mensagemErro = "WiFi desconectado";
    return false;
  }

  HTTPClient http;
  http.begin(presencaURL);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"uid\":\"" + uid + "\",";
  json += "\"data\":\"" + dataHoje + "\",";
  json += "\"hora\":\"" + horario + "\"";
  json += "}";

  Serial.println("POST /api/presenca");
  Serial.println(json);

  int httpCode = http.POST(json);
  String resposta = http.getString();

  Serial.println("HTTP Code: " + String(httpCode));
  Serial.println("Resposta: " + resposta);

  if (httpCode == 200) {
    nomeRecebido = extrairCampoJson(resposta, "nome");
    cursoRecebido = extrairCampoJson(resposta, "curso");
    acaoRecebida = extrairCampoJson(resposta, "acao");
    http.end();
    return true;
  }

  if (httpCode == 404) {
    mensagemErro = "Nao cadastrado";
  } else if (httpCode == 403) {
    mensagemErro = "Usuario inativo";
  } else if (httpCode <= 0) {
    mensagemErro = "Servidor offline";
  } else {
    mensagemErro = "Erro HTTP " + String(httpCode);
  }

  http.end();
  return false;
}

// =====================================================
// RESET LOCAL
// =====================================================
bool resetarPresencasNoServidor(String dataHoje, String horario) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  http.begin(resetURL);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"data\":\"" + dataHoje + "\",";
  json += "\"hora\":\"" + horario + "\"";
  json += "}";

  Serial.println("POST /api/reset-presencas");
  Serial.println(json);

  int httpCode = http.POST(json);
  String resposta = http.getString();

  Serial.println("HTTP Reset Code: " + String(httpCode));
  Serial.println("Resposta reset: " + resposta);

  http.end();
  return httpCode == 200;
}

void verificarReset(String dataHoje, String horario, int horaNum, int minNum) {
  if (ultimaDataReset != dataHoje) {
    ultimaDataReset = dataHoje;
    reset11 = false;
    reset17 = false;
    reset23 = false;
  }

  if (horaNum == 11 && minNum == 50 && !reset11) {
    Serial.println("Executando reset 11:50...");
    if (resetarPresencasNoServidor(dataHoje, horario)) {
      reset11 = true;
      Serial.println("Reset 11:50 OK");
    } else {
      Serial.println("Falha reset 11:50");
    }
  }

  if (horaNum == 17 && minNum == 50 && !reset17) {
    Serial.println("Executando reset 17:50...");
    if (resetarPresencasNoServidor(dataHoje, horario)) {
      reset17 = true;
      Serial.println("Reset 17:50 OK");
    } else {
      Serial.println("Falha reset 17:50");
    }
  }

  if (horaNum == 23 && minNum == 50 && !reset23) {
    Serial.println("Executando reset 23:50...");
    if (resetarPresencasNoServidor(dataHoje, horario)) {
      reset23 = true;
      Serial.println("Reset 23:50 OK");
    } else {
      Serial.println("Falha reset 23:50");
    }
  }
}
// =====================================================
// SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  SPI.begin(18, 19, 23, 5);
  rfid.PCD_Init();

  lcd.init();
  lcd.backlight();

  conectarWifi();
  mostrarTelaInicial();
}

// =====================================================
// LOOP
// =====================================================
void loop() {
  if (!garantirWiFi()) {
    delay(1000);
    return;
  }

  String dataHoje = "";
  String horario = "";
  int horaNum = 0;
  int minNum = 0;

  if (!obterDataHoraServidor(dataHoje, horario, horaNum, minNum)) {
    Serial.println("Falha ao obter data/hora do servidor.");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Sem hora local");
    lcd.setCursor(0, 1);
    lcd.print("Verif servidor");
    delay(1500);
    mostrarTelaInicial();
    delay(500);
    return;
  }

  verificarReset(dataHoje, horario, horaNum, minNum);

  // Espera cartão
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(80);
    return;
  }

  // Monta UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();

  Serial.println("Cartao detectado: " + uid);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Registrando...");
  lcd.setCursor(0, 1);
  lcd.print("Aguarde");

  String nome = "";
  String curso = "";
  String acao = "";
  String mensagemErro = "";

  bool ok = enviarPresencaLocal(
    uid,
    dataHoje,
    horario,
    nome,
    curso,
    acao,
    mensagemErro
  );

  if (!ok) {
    lcd.clear();
    lcd.setCursor(0, 0);

    if (mensagemErro == "Nao cadastrado") {
      lcd.print("Nao cadastrado");
      lcd.setCursor(0, 1);
      lcd.print("Acesso negado");
    } else if (mensagemErro == "Usuario inativo") {
      lcd.print("Usuario inativo");
      lcd.setCursor(0, 1);
      lcd.print("Acesso negado");
    } else {
      lcd.print("Erro servidor");
      lcd.setCursor(0, 1);
      lcd.print("Tente dnv");
    }

    Serial.println("Falha: " + mensagemErro);

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    delay(2000);
    mostrarTelaInicial();
    return;
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(nome.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(acao == "entrada" ? "Entrada OK!" : "Saida OK!");

  Serial.println("Registro OK");
  Serial.println("Nome: " + nome);
  Serial.println("Curso: " + curso);
  Serial.println("Acao: " + acao);
  Serial.println("Hora: " + horario);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  delay(2000);
  mostrarTelaInicial();
}
