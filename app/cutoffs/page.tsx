"use client"

import React, { useState, useEffect } from 'react'
import { Moon, Sun, Upload, FileText, X, CheckCircle, AlertCircle, Link } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { Button } from "@nextui-org/button"
import { Input } from "@nextui-org/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@nextui-org/progress"
import { cn } from "@/lib/utils"

const CutoffsPage: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setMessage(null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  })

  const handleWebScrape = async () => {
    if (!url) {
      setMessage({ type: 'error', text: 'Please enter a valid URL.' })
      return
    }

    setScraping(true)
    setMessage(null)

    try {
      const response = await axios.post("http://localhost:5000/scrape", 
        { url }, 
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      // Create a File object from the blob
      const pdfFile = new File([response.data], 'scraped_data.pdf', { type: 'application/pdf' })
      
      // Automatically set the file and trigger upload
      setFile(pdfFile)
      setMessage({ type: 'success', text: 'Web scraping completed. PDF generated.' })
    } catch (error: any) {
      console.error("Scraping error:", error)
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Web scraping failed. Check server logs.' 
      })
    } finally {
      setScraping(false)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file to upload.' })
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    setUploadProgress(0)
    setMessage(null)

    try {
      const response = await axios.post("http://localhost:5000/api/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1))
          setUploadProgress(percentCompleted)
        },
      })
      setMessage({ type: 'success', text: response.data.message })
      setFile(null)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Upload failed.' })
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setFile(null)
    setMessage(null)
  }

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} transition-colors duration-500`}>
      <div className="max-w-4xl mx-auto p-6">
        <Card className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-xl overflow-hidden`}>
          <CardHeader className="p-6 bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-white">
                EduMitra Cutoffs Upload
              </CardTitle>
              <Button
                variant="ghost"
                size="md"
                onClick={toggleTheme}
                className="text-white rounded-full hover:text-white hover:bg-white/20"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex space-x-2">
              <Input 
                type="text"
                placeholder="Enter URL to scrape"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-grow"
                startContent={<Link className="h-5 w-5 text-gray-900 dark:text-gray-300" />}
              />
              <Button
                onClick={handleWebScrape}
                disabled={scraping}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg transition-all duration-300 hover:from-purple-700 hover:to-pink-700"
              >
                {scraping ? 'Scraping...' : 'Scrape'}
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors duration-300',
                isDragActive ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-700',
                theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-900'
              )}
            >
              <input {...getInputProps()} />
              <Upload className={`h-16 w-16 mb-4 ${isDragActive ? 'text-purple-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
              {isDragActive ? (
                <p className="text-lg font-medium text-purple-500">Drop the file here...</p>
              ) : (
                <p className="text-lg font-medium text-center">
                  Drag and drop a PDF file here, or click to select a file
                </p>
              )}
            </div>

            {file && (
              <div className={`flex items-center justify-between p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-purple-500" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={removeFile}
                  className={`rounded-lg hover:text-red-500 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg transition-all duration-300 hover:from-purple-700 hover:to-pink-700"
            >
              {uploading ? 'Uploading...' : 'Upload Cutoffs'}
            </Button>

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-center">{uploadProgress}% Uploaded</p>
              </div>
            )}

            {message && (
              <div className={cn(
                'p-4 rounded-lg flex items-center space-x-2',
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              )}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <p>{message.text}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CutoffsPage;