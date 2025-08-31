import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type DocType = 'README.md' | 'FUNCTIONAL_MANUAL.md' | 'TECHNICAL_MANUAL.md' | 'CHANGELOG.md';

const DOCS: { id: DocType; title: string }[] = [
  { id: 'README.md', title: 'README' },
  { id: 'FUNCTIONAL_MANUAL.md', title: 'Functional Manual' },
  { id: 'TECHNICAL_MANUAL.md', title: 'Technical Manual' },
  { id: 'CHANGELOG.md', title: 'Version Log' },
];

const InfoView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DocType>('README.md');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDoc = async () => {
      setIsLoading(true);
      try {
        const docContent = await window.electronAPI.getDoc(activeTab);
        setContent(docContent);
      } catch (error) {
        console.error(`Failed to load content for ${activeTab}:`, error);
        setContent(`# Error\n\nCould not load documentation file.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoc();
  }, [activeTab]);

  const memoizedMarkdown = useMemo(() => (
    <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 border-b border-gray-600 pb-2" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3 border-b border-gray-600 pb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-4 mb-2" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 pl-4" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 pl-4" {...props} />,
            li: ({node, ...props}) => <li className="mb-2" {...props} />,
            code: ({node, inline, ...props}) => {
                return inline ? (
                    <code className="bg-gray-700 text-cyan-300 rounded-sm px-1 py-0.5 text-sm" {...props} />
                ) : (
                    <pre className="bg-gray-800 rounded-md p-4 overflow-x-auto my-4">
                        <code className="text-sm" {...props} />
                    </pre>
                );
            },
            a: ({node, ...props}) => <a className="text-cyan-400 hover:underline" target="_blank" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-400 my-4" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-gray-200" {...props} />,
        }}
    />
  ), [content]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl w-full mx-auto animate-fade-in">
        <div className="flex border-b border-gray-700">
            {DOCS.map(doc => (
                <button
                    key={doc.id}
                    onClick={() => setActiveTab(doc.id)}
                    className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                        activeTab === doc.id
                        ? 'border-b-2 border-cyan-500 text-white'
                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                    }`}
                >
                    {doc.title}
                </button>
            ))}
        </div>
        <div className="p-6 sm:p-8 max-h-[calc(100vh-150px)] overflow-y-auto">
            {isLoading ? (
                <div className="text-center py-10 text-gray-400">Loading document...</div>
            ) : (
                <article className="prose prose-invert max-w-none">
                    {memoizedMarkdown}
                </article>
            )}
        </div>
    </div>
  );
};

export default InfoView;
