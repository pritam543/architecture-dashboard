import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Plus, ShieldCheck, Lock, FolderOpen, Upload,
  Eye, Download, X, Filter, Loader2, Maximize2, Trash2
} from 'lucide-react';

// Supabase Configuration
const SUPABASE_URL = 'https://ogbsvqhtyxncdyootatz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ORi4qEY5nF45AzfKQrNGLw_DgX9JPJV';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CATEGORIES = [
  'All',
  'Architecture',
  'Turnkey',
  'Landscape',
  'Government',
  'Residential',
  'Interior',
  'Commercial'
];

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modals & Forms State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);

  // New Project Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Architecture');
  const [newDesc, setNewDesc] = useState('');
  const [newFiles, setNewFiles] = useState([]);

  // Add more media to existing project state
  const [additionalFiles, setAdditionalFiles] = useState([]);

  // Fetch Projects from Supabase on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Login (Default PIN: 1234)
  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === '1234') {
      setIsAdmin(true);
      setPasscode('');
    } else {
      alert('Incorrect PIN! (Default PIN is 1234)');
    }
  };

  // Upload raw files to Supabase Storage Bucket
  const uploadFilesToSupabase = async (filesArray) => {
    const uploadedMedia = [];
    for (let fileObj of filesArray) {
      const file = fileObj.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('architecture-media')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload failed:', uploadError.message);
        continue;
      }

      // Get Public URL
      const { data: publicURLData } = supabase.storage
        .from('architecture-media')
        .getPublicUrl(filePath);

      uploadedMedia.push({
        id: Date.now() + Math.random(),
        url: publicURLData.publicUrl,
        type: file.type.startsWith('video') ? 'video' : 'image',
        name: file.name
      });
    }
    return uploadedMedia;
  };

  // Handle File Selection
  const handleFileChange = (e, isAdditional = false) => {
    const filesArray = Array.from(e.target.files).map(file => ({
      file: file,
      previewUrl: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? 'video' : 'image',
      name: file.name
    }));

    if (isAdditional) {
      setAdditionalFiles(prev => [...prev, ...filesArray]);
    } else {
      setNewFiles(prev => [...prev, ...filesArray]);
    }
  };

  // Create New Project & Save to Supabase
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setUploading(true);
      const uploadedMedia = await uploadFilesToSupabase(newFiles);

      const newProjectData = {
        title: newTitle,
        category: newCategory,
        description: newDesc,
        media: uploadedMedia
      };

      const { data, error } = await supabase
        .from('projects')
        .insert([newProjectData])
        .select();

      if (error) throw error;

      if (data) {
        setProjects([data[0], ...projects]);
      }

      setNewTitle('');
      setNewDesc('');
      setNewCategory('Architecture');
      setNewFiles([]);
      setShowAddModal(false);
      alert('Project successfully created and saved to Cloud!');
    } catch (error) {
      console.error('Error creating project:', error.message);
      alert('Failed to create project: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Add More Media to Selected Project
  const handleAddMoreMedia = async (e) => {
    e.preventDefault();
    if (additionalFiles.length === 0) return;

    try {
      setUploading(true);
      const newlyUploaded = await uploadFilesToSupabase(additionalFiles);
      const updatedMediaList = [...selectedProject.media, ...newlyUploaded];

      const { error } = await supabase
        .from('projects')
        .update({ media: updatedMediaList })
        .eq('id', selectedProject.id);

      if (error) throw error;

      const updatedProj = {
        ...selectedProject,
        media: updatedMediaList
      };

      setSelectedProject(updatedProj);
      setProjects(projects.map(p => p.id === updatedProj.id ? updatedProj : p));
      setAdditionalFiles([]);
      alert('New media files successfully uploaded and saved!');
    } catch (error) {
      console.error('Error adding media:', error.message);
      alert('Failed to upload media: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete Individual Media Item from Project
  const handleRemoveMediaItem = async (mediaIdToRemove) => {
    if (!window.confirm('Are you sure you want to delete this media file?')) return;

    try {
      const updatedMediaList = selectedProject.media.filter(item => item.id !== mediaIdToRemove);

      const { error } = await supabase
        .from('projects')
        .update({ media: updatedMediaList })
        .eq('id', selectedProject.id);

      if (error) throw error;

      const updatedProj = {
        ...selectedProject,
        media: updatedMediaList
      };

      setSelectedProject(updatedProj);
      setProjects(projects.map(p => p.id === updatedProj.id ? updatedProj : p));
      alert('Media item removed successfully!');
    } catch (error) {
      console.error('Error removing media:', error.message);
      alert('Failed to remove media: ' + error.message);
    }
  };

  // Delete Entire Project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this entire project? This action cannot be undone!')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      setSelectedProject(null);
      alert('Project deleted successfully!');
    } catch (error) {
      console.error('Error deleting project:', error.message);
      alert('Failed to delete project: ' + error.message);
    }
  };

  // Filter Projects
  const filteredProjects = activeFilter === 'All'
    ? projects
    : projects.filter(p => p.category === activeFilter);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500 p-2.5 rounded-xl text-white shadow-md">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-slate-900">Architecture Portfolio Dashboard</h1>
              <p className="text-xs text-slate-500">Cloud Connected Site Visits & Media Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-700 text-sm font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Admin Mode Active</span>
                <button
                  onClick={() => setIsAdmin(false)}
                  className="ml-2 text-xs bg-slate-200 hover:bg-slate-300 px-2.5 py-1 rounded text-slate-700 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="flex items-center gap-2">
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="password"
                    placeholder="Admin PIN (1234)"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="bg-slate-100 border border-slate-300 pl-9 pr-3 py-1.5 text-sm rounded-lg focus:outline-none focus:border-amber-500 text-slate-800 w-36"
                  />
                </div>
                <button type="submit" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3.5 py-1.5 rounded-lg text-sm shadow-sm transition">
                  Login
                </button>
              </form>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md transition"
              >
                <Plus className="w-5 h-5" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 mt-6">

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          <div className="flex items-center text-slate-500 mr-2 text-sm font-medium">
            <Filter className="w-4 h-4 mr-1" /> Filter:
          </div>
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${activeFilter === category
                ? 'bg-amber-500 text-white shadow-md font-semibold'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
            <span className="ml-3 text-slate-500 text-sm font-medium">Loading projects from cloud...</span>
          </div>
        ) : (
          /* Projects Grid */
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-lg font-medium">No projects found in this category.</p>
              </div>
            ) : (
              filteredProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-amber-400 transition cursor-pointer flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Thumbnail Preview */}
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                      {project.media && project.media.length > 0 ? (
                        project.media[0].type === 'image' ? (
                          <img src={project.media[0].url} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        ) : (
                          <video src={project.media[0].url} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                          <FolderOpen className="w-10 h-10" />
                        </div>
                      )}
                      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm">
                        {project.category}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition">{project.title}</h3>
                      <p className="text-slate-500 text-sm mt-2 line-clamp-2">{project.description || 'No description provided.'}</p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span>📷 {project.media ? project.media.length : 0} Files uploaded</span>
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition"
                          title="Delete Project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <span className="text-amber-600 font-semibold group-hover:underline flex items-center gap-1">
                        View <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* Floating Add Button */}
      {isAdmin && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 bg-amber-500 hover:bg-amber-400 text-slate-950 p-4 rounded-full shadow-xl transition z-20 flex items-center justify-center font-bold"
          title="Add New Project"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* MODAL 1: Create New Project */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Create New Architecture Project</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Commercial Complex"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-900"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="Site details, client instructions, measurements..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-900"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Upload Site Photos & Videos</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-1">{newFiles.length} files selected.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md flex items-center gap-2"
                >
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {uploading ? 'Uploading to Cloud...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View Project Details & Media Gallery */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200">
                  {selectedProject.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedProject.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteProject(selectedProject.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Project
                  </button>
                )}
                <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-700 p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-slate-500 mb-1">Project Description</h4>
                <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm leading-relaxed">
                  {selectedProject.description || 'No description provided.'}
                </p>
              </div>

              {/* Add More Media Section (Admin Only) */}
              {isAdmin && (
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                  <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Add More Photos/Videos to this Project
                  </h4>
                  <form onSubmit={handleAddMoreMedia} className="flex flex-col sm:flex-row gap-3 items-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => handleFileChange(e, true)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-white cursor-pointer"
                    />
                    <button
                      type="submit"
                      disabled={additionalFiles.length === 0 || uploading}
                      className={`w-full sm:w-auto px-5 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition flex items-center justify-center gap-2 ${additionalFiles.length > 0 && !uploading
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {uploading ? 'Uploading...' : `Upload (${additionalFiles.length})`}
                    </button>
                  </form>
                </div>
              )}

              {/* Media Gallery Grid */}
              <div>
                <h4 className="text-sm font-semibold text-slate-500 mb-3">Project Media Gallery ({selectedProject.media ? selectedProject.media.length : 0} files)</h4>
                <p className="text-xs text-slate-400 mb-3">💡 Tip: Click on any image/video to view full screen. Admin can remove individual files anytime.</p>

                {!selectedProject.media || selectedProject.media.length === 0 ? (
                  <p className="text-slate-400 text-sm py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">No media files uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selectedProject.media.map((item, idx) => (
                      <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden group shadow-sm hover:shadow-md transition relative">
                        {/* Admin Delete Individual Image Button */}
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveMediaItem(item.id)}
                            className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition"
                            title="Remove this file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div
                          onClick={() => setPreviewMedia(item)}
                          className="h-32 bg-slate-100 flex items-center justify-center overflow-hidden relative cursor-pointer"
                          title="Click to view full screen"
                        >
                          {item.type === 'image' ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          ) : (
                            <video src={item.url} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1 text-xs font-semibold">
                            <Maximize2 className="w-4 h-4" /> View Full
                          </div>
                        </div>
                        <div className="p-2.5 flex justify-between items-center text-xs bg-white border-t border-slate-100">
                          <span className="truncate text-slate-700 max-w-[100px] font-medium">{item.name || `Media ${idx + 1}`}</span>
                          <a
                            href={item.url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-600 hover:text-amber-700 p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 transition"
                            title="Download File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold transition"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL: Full Screen Image/Video Viewer */}
      {previewMedia && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-12 right-0 text-white hover:text-amber-400 bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition"
              title="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 max-h-[80vh] flex items-center justify-center p-2 w-full">
              {previewMedia.type === 'image' ? (
                <img src={previewMedia.url} alt={previewMedia.name} className="max-h-[75vh] max-w-full object-contain rounded-lg" />
              ) : (
                <video src={previewMedia.url} controls autoPlay className="max-h-[75vh] max-w-full rounded-lg" />
              )}
            </div>

            <div className="mt-4 flex items-center justify-between w-full px-4 text-white bg-slate-900/60 py-3 rounded-xl backdrop-blur-md border border-slate-800">
              <span className="text-sm font-medium truncate max-w-md">📄 {previewMedia.name}</span>
              <a
                href={previewMedia.url}
                download
                target="_blank"
                rel="noreferrer"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-4 h-4" /> Download File
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}