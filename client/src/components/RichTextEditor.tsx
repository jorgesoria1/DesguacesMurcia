import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bold, Italic, Link, List, AlignLeft, Type, Image, Underline, AlignCenter, AlignRight, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [htmlContent, setHtmlContent] = useState(content);

  useEffect(() => {
    setHtmlContent(content);
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      // Sanitize content before setting innerHTML to prevent XSS
      const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'style', 'class'],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });
      editorRef.current.innerHTML = sanitizedContent;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setHtmlContent(newContent);
      onChange(newContent);
    }
  };

  const handleHtmlChange = (newHtml: string) => {
    setHtmlContent(newHtml);
    onChange(newHtml);
    if (editorRef.current) {
      // Sanitize HTML content before setting innerHTML to prevent XSS
      const sanitizedHtml = DOMPurify.sanitize(newHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'div'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'style', 'class'],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });
      editorRef.current.innerHTML = sanitizedHtml;
    }
  };

  const executeCommand = (command: string, value?: string) => {
    // Usar la API moderna cuando esté disponible, fallback a execCommand
    try {
      if (document.queryCommandSupported && document.queryCommandSupported(command)) {
        document.execCommand(command, false, value);
      } else {
        // Fallback manual para comandos básicos
        handleModernCommand(command, value);
      }
    } catch (error) {
      console.warn('Error executing command:', command, error);
      // Fallback manual
      handleModernCommand(command, value);
    }
    editorRef.current?.focus();
    handleInput();
  };

  const handleModernCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    switch (command) {
      case 'bold':
        toggleWrap('strong');
        break;
      case 'italic':
        toggleWrap('em');
        break;
      case 'underline':
        toggleWrap('u');
        break;
      case 'createLink':
        if (value) {
          const link = document.createElement('a');
          link.href = value;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          try {
            range.surroundContents(link);
          } catch (e) {
            range.deleteContents();
            range.insertNode(link);
          }
        }
        break;
      case 'insertImage':
        if (value) {
          const img = document.createElement('img');
          img.src = value;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          range.insertNode(img);
        }
        break;
      case 'insertUnorderedList':
        toggleList('ul');
        break;
      default:
        // Para comandos de justificación, usar CSS
        if (command.startsWith('justify')) {
          const alignment = command.replace('justify', '').toLowerCase();
          const div = document.createElement('div');
          div.style.textAlign = alignment === 'left' ? 'left' : alignment === 'center' ? 'center' : 'right';
          try {
            range.surroundContents(div);
          } catch (e) {
            range.deleteContents();
            range.insertNode(div);
          }
        }
        break;
    }
  };

  const toggleWrap = (tagName: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      const element = document.createElement(tagName);
      element.textContent = selectedText;
      range.deleteContents();
      range.insertNode(element);
    }
  };

  const toggleList = (listType: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (selectedText) {
      const list = document.createElement(listType);
      const listItem = document.createElement('li');
      listItem.textContent = selectedText;
      list.appendChild(listItem);
      range.deleteContents();
      range.insertNode(list);
    }
  };

  const insertLink = () => {
    const url = prompt('Ingrese la URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const insertImage = () => {
    const url = prompt('Ingrese la URL de la imagen:');
    if (url) {
      executeCommand('insertImage', url);
    }
  };

  const formatButtons = [
    { icon: Bold, command: 'bold', title: 'Negrita' },
    { icon: Italic, command: 'italic', title: 'Cursiva' },
    { icon: Underline, command: 'underline', title: 'Subrayado' },
    { icon: AlignLeft, command: 'justifyLeft', title: 'Alinear izquierda' },
    { icon: AlignCenter, command: 'justifyCenter', title: 'Centrar' },
    { icon: AlignRight, command: 'justifyRight', title: 'Alinear derecha' },
    { icon: List, command: 'insertUnorderedList', title: 'Lista' },
  ];

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">Editor Visual</TabsTrigger>
          <TabsTrigger value="html">Código HTML</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="m-0">
          {/* Toolbar */}
          <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
            {formatButtons.map((button) => (
              <Button
                key={button.command}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => executeCommand(button.command)}
                title={button.title}
                type="button"
              >
                <button.icon className="h-4 w-4" />
              </Button>
            ))}
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertLink}
              title="Insertar enlace"
              type="button"
            >
              <Link className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={insertImage}
              title="Insertar imagen"
              type="button"
            >
              <Image className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <select
              onChange={(e) => executeCommand('formatBlock', e.target.value)}
              className="h-8 px-2 text-sm border rounded"
              defaultValue=""
            >
              <option value="">Formato</option>
              <option value="h1">Título 1</option>
              <option value="h2">Título 2</option>
              <option value="h3">Título 3</option>
              <option value="p">Párrafo</option>
            </select>
          </div>

          {/* Visual Editor */}
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onFocus={() => setIsEditorFocused(true)}
              onBlur={() => setIsEditorFocused(false)}
              className={cn(
                "min-h-[300px] p-4 outline-none prose prose-sm max-w-none",
                "focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                !content && !isEditorFocused && "text-gray-400"
              )}
              style={{ 
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
              suppressContentEditableWarning={true}
            />
            
            {!content && !isEditorFocused && (
              <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                {placeholder || "Escriba el contenido aquí..."}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="html" className="m-0">
          <Textarea
            value={htmlContent}
            onChange={(e) => handleHtmlChange(e.target.value)}
            placeholder="Ingrese el código HTML aquí..."
            className="min-h-[400px] font-mono text-sm border-0 rounded-none resize-none"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}