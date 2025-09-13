/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat } from '@google/genai';

// Elementos del widget de chat
const widgetContainer = document.getElementById('chat-widget-container');
const chatContainer = document.getElementById('chat-container');
const messagesContainer = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input') as HTMLInputElement;

// Elementos de control del widget
const launcherButton = document.getElementById('chat-launcher');
const closeButton = document.getElementById('close-chat-button');


if (!widgetContainer || !chatContainer || !messagesContainer || !chatForm || !chatInput || !launcherButton || !closeButton) {
  throw new Error('Missing required DOM elements for the chat widget');
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chat: Chat;
let isChatInitialized = false;

const systemInstruction = `
  Eres un agente de ventas experto y amigable de TurboPixel SV, un proveedor de servicios de diseño web y hosting en El Salvador. 
  Tu único objetivo es vender los servicios que se encuentran en https://turbopixelsv.com/es/.
  Debes ser persuasivo, servicial y proactivo. Tu conocimiento se basa exclusivamente en la información de ese sitio web.
  No hables de otros temas. Si te preguntan algo no relacionado, amablemente redirige la conversación a los servicios de TurboPixel SV.
  Responde a las preguntas de los clientes, explica los beneficios de los servicios (Diseño Web, Alojamiento Web, Dominios, Certificados SSL), y guía a los clientes para que tomen una decisión de compra. 
  Utiliza un tono profesional pero cercano y siempre en español. No inventes precios, si no conoces un precio, sugiere que contacten al soporte oficial.
  Comienza la conversación presentándote y preguntando en qué puedes ayudar.
`;

async function initializeChat() {
  try {
    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
    });
    // Start the conversation with a welcome message when chat is opened first time
    streamResponse('Hola');
    isChatInitialized = true;
  } catch (error) {
    console.error('Error initializing chat:', error);
    addMessage('Error al iniciar el asistente. Por favor, inténtalo de nuevo.', 'system');
  }
}

function addMessage(text: string, sender: 'user' | 'model' | 'system', isStreaming = false) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', `${sender}-message`);
  
  if (isStreaming) {
    messageElement.classList.add('streaming');
  }

  // Basic markdown to HTML conversion
  let htmlText = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
  messageElement.innerHTML = htmlText;
  messagesContainer.appendChild(messageElement);
  scrollToBottom();
  return messageElement;
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function streamResponse(prompt: string) {
  if (!chat) {
    addMessage('El chat no está inicializado.', 'system');
    return;
  }
  
  let currentResponse = '';
  let messageElement: HTMLElement | null = null;
  setLoading(true);

  try {
    const responseStream = await chat.sendMessageStream({ message: prompt });
    setLoading(false);
    
    for await (const chunk of responseStream) {
      if (!messageElement) {
        // First chunk, create the message element
        messageElement = addMessage('', 'model', true);
      }
      currentResponse += chunk.text;
      
      // Basic markdown to HTML for streaming
      let htmlText = currentResponse
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      messageElement.innerHTML = htmlText;
      scrollToBottom();
    }

    if (messageElement) {
      messageElement.classList.remove('streaming');
    }

  } catch (error) {
    console.error('Error sending message:', error);
    setLoading(false);
    addMessage('Lo siento, ocurrió un error al procesar tu solicitud.', 'system');
  }
}

function setLoading(isLoading: boolean) {
    const existingTypingIndicator = document.querySelector('.typing-indicator');
    if (isLoading) {
        if (!existingTypingIndicator) {
            const typingIndicator = document.createElement('div');
            typingIndicator.classList.add('message', 'model-message', 'typing-indicator');
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            messagesContainer.appendChild(typingIndicator);
            scrollToBottom();
        }
    } else {
        if (existingTypingIndicator) {
            existingTypingIndicator.remove();
        }
    }
}

function toggleChat() {
    document.body.classList.toggle('chat-open');
    if (document.body.classList.contains('chat-open') && !isChatInitialized) {
        initializeChat();
    }
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userInput = chatInput.value.trim();
  if (!userInput) return;

  addMessage(userInput, 'user');
  chatInput.value = '';

  await streamResponse(userInput);
});

// Event listeners for controlling the widget
launcherButton.addEventListener('click', toggleChat);
closeButton.addEventListener('click', toggleChat);
