'use client'

import { Box, Button, Stack, TextField, useMediaQuery, useTheme, MenuItem, Select } from '@mui/material'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey there! I'm here to help you discover hidden gems and unique spots away from the tourist trails and provide you with up-to-date weather information. What would you like to know today?"
    },
  ])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [language, setLanguage] = useState('en') 
  const messagesEndRef = useRef(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Pastel color palette
  const colors = {
    background: '#fafcf5',
    assistant: '#3B719F',
    user: '#FF6F6F',
    text: '#FAFFEE',
    button: '#3B719F',
  }

  const sendMessage = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    
    const newMessage = { role: 'user', content: message };
    setMessages((prevMessages) => [
      ...prevMessages,
      newMessage,
      { role: 'assistant', content: '' },
    ]);

    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, language }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const assistantResponse = data.message || "Sorry, I couldn't process your request.";

      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { role: 'assistant', content: assistantResponse },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: "I'm sorry, but I encountered an error. Please try again later." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <Box
      width="100%"
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      sx={{
        padding: isMobile ? theme.spacing(2) : theme.spacing(4),
        backgroundColor: colors.background,
        backgroundImage: 'url(/background.svg)', 
        backgroundSize: 'cover',                
        backgroundRepeat: 'no-repeat',          
        backgroundPosition: 'center',           
        overflowX: 'hidden', 
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: '500px' }}
      >
        <Box 
          sx={{ 
            backgroundColor: colors.assistant, 
            borderRadius: '12px', 
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'center'
          }}
        >
          <h1 style={{ color: colors.text, marginBottom: '10px' }}>NomadAI</h1>
          <p style={{ color: colors.text }}>
            Explore the unexplored with NomadAI.<br/> Your AI guide finds hidden gems and keeps you up-to-date with the latest weather!
          </p>
        </Box>
        <Stack
          direction="column"
          width="100%"
          maxWidth="500px"
          height={isMobile ? "90vh" : "500px"}
          border={`2px solid ${colors.button}`}
          borderRadius={theme.shape.borderRadius}
          p={2}
          spacing={3}
          sx={{ 
            backgroundColor: '#fafcf5',
            overflow: 'hidden',
          }}
        >
          <Stack
            direction="column"
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
            sx={{ 
              overflowX: 'hidden', 
            }}
          >
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Box
                    display="flex"
                    justifyContent={msg.role === 'assistant' ? 'flex-start' : 'flex-end'}
                    sx={{ mb: 1 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Box
                        bgcolor={msg.role === 'assistant' ? colors.assistant : colors.user}
                        color={colors.text}
                        borderRadius={5}
                        p={2}
                        sx={{
                          fontSize: isMobile ? '0.9rem' : '1rem',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'break-word',
                        }}
                      >
                        {msg.content}
                      </Box>
                    </motion.div>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </Stack>
          <Stack direction={isMobile ? "column" : "row"} spacing={2} alignItems="stretch">
            <TextField
              label="Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              InputProps={{
                style: {
                  fontSize: isMobile ? '0.9rem' : '1rem',
                }
              }}
            />
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              variant="outlined"
              sx={{
                minWidth: '100px',
                height: isMobile ? '40px' : '100%',
                fontSize: isMobile ? '0.9rem' : '1rem',
              }}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="it">Italian</MenuItem>
            </Select>
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              style={{ display: 'flex' }}
            >
              <Button 
                variant="contained" 
                onClick={sendMessage}
                disabled={isLoading}
                fullWidth={isMobile}
                style={{ 
                  height: isMobile ? '40px' : '100%', 
                  minWidth: isMobile ? '100%' : '80px',
                  backgroundColor: colors.button,
                  color: colors.text,
                  fontSize: isMobile ? '0.9rem' : '1rem',
                }}
              >
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </motion.div>
          </Stack>
        </Stack>
      </motion.div>
    </Box>
  );
}
