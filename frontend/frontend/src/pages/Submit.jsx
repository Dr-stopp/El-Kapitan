import { useRef, useState } from 'react'
import {
  UPLOAD_OPTIONS,
  uploadSubmissionAsset,
  validateSubmissionFile,
} from '../lib/submissionUpload'

export default function Submit() {
  const [assignmentKey, setAssignmentKey] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const uploadOption = {
    ...UPLOAD_OPTIONS.repository,
    label: 'Assignment (.zip)',
    submitLabel: 'Submit Assignment',
  }

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (f) => {
    const kind = 'repository'
    const err = validateSubmissionFile(f, kind)
    if (err) {
      setError(err)
      setFile(null)
      resetFileInput()
    } else {
      setError('')
      setFile(f)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const fileErr = validateSubmissionFile(file, 'repository')
    if (fileErr) {
      setError(fileErr)
      return
    }

    setLoading(true)

    try {
      await uploadSubmissionAsset({
        assignmentRunId: assignmentKey,
        firstName,
        lastName,
        email,
        file,
        submissionKind: 'file',
      })

      setSuccess('Your assignment zip was uploaded successfully.')
      setAssignmentKey('')
      setFirstName('')
      setLastName('')
      setEmail('')
      setFile(null)
      resetFileInput()
    } catch (error) {
      setError(error.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="text-3xl font-bold text-primary mb-2">Submit Your Work</h1>
      <p className="text-text-muted mb-8">
        Enter the assignment key provided by your instructor and upload your assignment as a single
        `.zip` file.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-error rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-success rounded-lg px-4 py-3 mb-6 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-warm p-6 sm:p-8 space-y-5">
        <div>
          <label htmlFor="assignmentKey" className="block text-sm font-medium mb-1">
            Assignment Key
          </label>
          <input
            id="assignmentKey"
            type="text"
            required
            value={assignmentKey}
            onChange={(e) => setAssignmentKey(e.target.value)}
            className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            placeholder="Enter the key from your instructor"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              placeholder="First name"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              placeholder="Last name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-warm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            placeholder="student@school.edu"
          />
        </div>

        <div className="rounded-lg border border-warm bg-accent/20 px-4 py-3 text-sm text-text">
          Upload format: <strong>Assignment (.zip)</strong>
          <div className="text-text-muted mt-1">
            Zip your assignment files first, then upload that archive here.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{uploadOption.label}</label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-primary bg-accent/30'
                : file
                  ? 'border-success bg-green-50'
                  : 'border-warm hover:border-primary/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div className="text-success">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-text-muted mt-1">Click or drag to replace</p>
              </div>
            ) : (
              <div className="text-text-muted">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="font-medium">Drag & drop your assignment zip here</p>
                <p className="text-sm mt-1">or click to browse</p>
                <p className="text-xs mt-2 opacity-70">
                  Accepted: {uploadOption.acceptedExtensions.join(', ')}
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={uploadOption.acceptAttr}
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? 'Uploading...' : uploadOption.submitLabel}
        </button>
      </form>
    </div>
  )
}
