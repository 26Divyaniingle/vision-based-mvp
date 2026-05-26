import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

const ChatBubble = ({ message, isUser }) => {
  
  const renderFormattedText = (msg, isUserMsg) => {
    if (isUserMsg) {
      return <Text style={styles.userText}>{msg}</Text>;
    }

    // Split by line
    const lines = msg.split('\n');
    
    return lines.map((line, lineIdx) => {
      let cleanLine = line.trim();
      if (!cleanLine && lineIdx > 0 && lineIdx < lines.length - 1) {
        // empty space line
        return <View key={lineIdx} style={{ height: 8 }} />;
      }
      
      // Check for headers (e.g. ### Header, ## Header, # Header)
      let headerLevel = 0;
      if (cleanLine.startsWith('### ')) {
        headerLevel = 3;
        cleanLine = cleanLine.substring(4);
      } else if (cleanLine.startsWith('## ')) {
        headerLevel = 2;
        cleanLine = cleanLine.substring(3);
      } else if (cleanLine.startsWith('# ')) {
        headerLevel = 1;
        cleanLine = cleanLine.substring(2);
      }
      
      // Check for bullet lists
      let isBullet = false;
      let isSubBullet = false;
      if (line.startsWith('  - ') || line.startsWith('    - ') || line.startsWith('  • ') || line.startsWith('    • ')) {
        isSubBullet = true;
        cleanLine = cleanLine.replace(/^[-•]\s+/, '');
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
        isBullet = true;
        cleanLine = cleanLine.replace(/^[-•*]\s+/, '');
      }
      
      // Parse inline bolding (**text**)
      const parts = [];
      const regex = /\*\*([^*]+)\*\*/g;
      let lastIndex = 0;
      let match;
      
      while ((match = regex.exec(cleanLine)) !== null) {
        // Add plain text before match
        if (match.index > lastIndex) {
          parts.push({ text: cleanLine.substring(lastIndex, match.index), bold: false });
        }
        // Add bold text
        parts.push({ text: match[1], bold: true });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < cleanLine.length) {
        parts.push({ text: cleanLine.substring(lastIndex), bold: false });
      }
      
      // Fallback if no bold matches
      const renderParts = parts.length > 0 ? parts : [{ text: cleanLine, bold: false }];
      
      // Custom style for headers, bullet lines, or normal lines
      let lineStyle = styles.botText;
      if (headerLevel > 0) {
        lineStyle = [
          styles.headerText,
          headerLevel === 1 ? styles.h1 : headerLevel === 2 ? styles.h2 : styles.h3
        ];
      }
      
      const renderedLineContent = renderParts.map((part, partIdx) => {
        // Check for alert words in the bold segment to colorize beautifully
        let textStyle = part.bold ? styles.boldText : null;
        const lowerText = part.text.toLowerCase();
        if (part.bold) {
          if (lowerText.includes('abnormal') || lowerText.includes('low') || lowerText.includes('high') || lowerText.includes('warning') || lowerText.includes('alert') || lowerText.includes('caution') || lowerText.includes('danger') || lowerText.includes('fail')) {
            textStyle = [styles.boldText, styles.alertText];
          } else if (lowerText.includes('normal') || lowerText.includes('safe') || lowerText.includes('clear') || lowerText.includes('healthy') || lowerText.includes('success')) {
            textStyle = [styles.boldText, styles.successText];
          }
        }
        return (
          <Text key={partIdx} style={textStyle}>
            {part.text}
          </Text>
        );
      });

      return (
        <View 
          key={lineIdx} 
          style={[
            styles.lineWrapper,
            isBullet && styles.bulletLine,
            isSubBullet && styles.subBulletLine,
            headerLevel > 0 && styles.headerLine
          ]}
        >
          {isBullet && <Text style={styles.bulletSymbol}>• </Text>}
          {isSubBullet && <Text style={styles.subBulletSymbol}>  ◦ </Text>}
          <Text style={lineStyle}>{renderedLineContent}</Text>
        </View>
      );
    });
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {renderFormattedText(message, isUser)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    flexDirection: 'row',
    width: '100%',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: Colors.indigo,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#fff',
  },
  botText: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#e0e0e0',
  },
  lineWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginVertical: 1.5,
    width: '100%',
  },
  bulletLine: {
    paddingLeft: 4,
  },
  subBulletLine: {
    paddingLeft: 16,
  },
  headerLine: {
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 4,
    width: '100%',
  },
  bulletSymbol: {
    color: Colors.indigo,
    fontSize: 14,
    fontWeight: 'bold',
  },
  subBulletSymbol: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  headerText: {
    color: '#fff',
    fontWeight: '800',
  },
  h1: { fontSize: 18 },
  h2: { fontSize: 16.5 },
  h3: { fontSize: 15, color: Colors.indigo },
  boldText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  alertText: {
    color: '#f43f5e',
  },
  successText: {
    color: '#10b981',
  },
});

export default ChatBubble;
