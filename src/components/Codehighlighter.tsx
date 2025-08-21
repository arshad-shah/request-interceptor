import React from 'react';
import SyntaxHighlighter  from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface CodeHighlighterProps {
    code: string;
    language?: string;
}

const CodeHighlighter: React.FC<CodeHighlighterProps> = ({ 
    code, 
    language = 'javascript' 
}) => {
    return (
        <SyntaxHighlighter language={language} style={docco}>
            {code}
        </SyntaxHighlighter>
    );
};

export default CodeHighlighter;