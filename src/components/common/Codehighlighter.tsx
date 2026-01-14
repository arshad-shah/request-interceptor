import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import tomorrowNightBright  from 'react-syntax-highlighter/dist/cjs/styles/hljs/tomorrow-night-bright';

interface CodeHighlighterProps {
    code: string;
    language?: string;
}

const CodeHighlighter: React.FC<CodeHighlighterProps> = ({ 
    code, 
    language = 'javascript' 
}) => {
    return (
        <SyntaxHighlighter language={language} style={tomorrowNightBright}>
            {code}
        </SyntaxHighlighter>
    );
};

export default CodeHighlighter;