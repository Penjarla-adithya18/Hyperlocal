'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  selectedFile?: File | null
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept = 'image/*,.pdf,.doc,.docx',
  maxSizeMB = 5,
  disabled = false
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Check file size
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > maxSizeMB) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB`)
      return
    }

    onFileSelect(file)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setError(null)
    onFileRemove?.()
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      {!selectedFile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={disabled}
          title="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      ) : (
        <Badge variant="secondary" className="gap-2 py-2 px-3 pr-1">
          {getFileIcon(selectedFile.name)}
          <span className="text-xs truncate max-w-[120px]">{selectedFile.name}</span>
          <span className="text-xs opacity-70">{formatFileSize(selectedFile.size)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-1"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  )
}
