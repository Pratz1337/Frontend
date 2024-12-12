"use client"

import React, { useEffect, useState } from 'react'
import { Moon, Sun, Loader2 } from 'lucide-react'
import { Button } from "@nextui-org/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import withAuth from "../withAuth";

interface Course {
  _id: string
  name: string
  description: string
  duration: string
  managementFees: string
  generalFees: string
}

const CourseSaved: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(`${process.env.API_URL ? process.env.API_URL : "http://localhost:5000"}/api/courses`)
        const data = await response.json()

        if (response.ok) {
          setCourses(data.courses)
        } else {
          setError(data.message || 'Failed to fetch courses.')
        }
      } catch (err) {
        console.error(err)
        setError('Network error occurred while fetching courses.')
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  return (
    <div className={`min-h-screen w-full ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'} transition-colors duration-500`}>
      <div className="max-w-4xl mx-auto p-6">
        <Card className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-lg rounded-xl overflow-hidden`}>
            <CardHeader className="p-6 bg-gradient-to-r from-purple-600 to-pink-600">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">
              EduMitra Saved Courses
              </h2>
              <div className="flex-grow"></div>
              <Button
              variant="solid"
              size="md"
              onClick={toggleTheme}
              className="text-white rounded-full hover:text-white hover:bg-white/20"
              >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
            </div>
            </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : error ? (
              <p className="text-center text-red-500">{error}</p>
            ) : courses.length === 0 ? (
              <p className="text-center">No courses found.</p>
            ) : (
              <div className="grid gap-6">
                {courses.map((course) => (
                  <Card key={course._id} className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <CardContent className="p-4">
                      <h2 className="text-xl font-semibold mb-2 text-purple-600">
                        {course.name}
                      </h2>
                      <p className="mb-4 text-sm">{course.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <p><strong>Duration:</strong> {course.duration}</p>
                        <p><strong>Management Fee:</strong> ${course.managementFees}</p>
                        <p><strong>General Fee: ${course.generalFees}</strong></p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(CourseSaved);