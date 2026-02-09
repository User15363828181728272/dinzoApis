
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-slate max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            return !inline && language ? (
              <CodeBlock 
                code={String(children).replace(/\n$/, '')} 
                language={language} 
              />
            ) : (
              <code className={`${className} bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>
                {children}
              </code>
            );
          },
          // Ensure other elements look good inside our bubbles
          p: ({children}) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({children}) => <ul className="list-disc ml-6 mb-3">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal ml-6 mb-3">{children}</ol>,
          li: ({children}) => <li className="mb-1">{children}</li>,
          h1: ({children}) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
          h2: ({children}) => <h2 className="text-xl font-bold mb-2">{children}</h2>,
          h3: ({children}) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
