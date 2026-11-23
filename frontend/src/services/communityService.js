import api from './api'

export const getMajors = () => api.get('/communities/majors/')

export const getCourses = (params = {}) => api.get('/communities/', { params })

export const getCourse = (id) => api.get(`/communities/${id}/`)

export const createCourse = (data) => api.post('/communities/', data)

export const joinCourse = (id) => api.post(`/communities/${id}/join/`)

export const leaveCourse = (id) => api.post(`/communities/${id}/leave/`)

export const getCourseMembers = (id) => api.get(`/communities/${id}/members/`)

export const gradeMember = (courseId, userId, data) =>
  api.post(`/communities/${courseId}/members/${userId}/grade/`, data)

export const getMyEnrollments = (userId = null) =>
  api.get('/communities/enrollments/', { params: userId ? { user: userId } : {} })
