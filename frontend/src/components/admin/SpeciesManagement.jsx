import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';

const SpeciesManagement = () => {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getCurrentUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    commonName: '',
    scientificName: '',
    category: 'Mammal',
    conservationStatus: 'LC',
    habitat: '',
    description: '',
    population: 0
  });

  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      const response = await api.get('/species');
      if (response.data.success) {
        setSpecies(response.data.data.species);
      }
    } catch (error) {
      console.error("Failed to fetch species", error);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteSpecies = async (id) => {
  if (window.confirm("Are you sure you want to delete this species? This will remove it from the database.")) {
    try {
      // Calls your backend DELETE /api/species/:id
      await api.delete(`/species/${id}`);
      
      // Updates the UI so the species disappears immediately
      setSpecies(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Cannot delete: This species is likely linked to existing sightings.");
    }
  }
};

const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // EDIT MODE
        const response = await api.put(`/species/${editingId}`, formData);
        setSpecies(prev => prev.map(s => s.id === editingId ? response.data.data.species : s));
      } else {
        // ADD MODE
        const response = await api.post('/species', formData);
        setSpecies(prev => [...prev, response.data.data.species]);
      }
      resetForm();
    } catch (error) {
      alert(error.response?.data?.message || "Operation failed");
    }
  };

  const resetForm = () => {
    setFormData({ commonName: '', scientificName: '', category: 'Mammal', conservationStatus: 'LC', habitat: '', description: '', population: 0 });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={currentUser} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Species Management</h1>
          <button onClick={() => {resetForm(); setIsModalOpen(true); }}
          className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            <Plus className="h-5 w-5 mr-2" />
            Add New Species
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Common Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scientific Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {species.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.commonName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 italic">{item.scientificName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.conservationStatus === 'Endangered' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.conservationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEditClick(item)}
                    className="text-blue-600 hover:text-blue-900 mr-4">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                        onClick={() => handleDeleteSpecies(item.id)} // Add this line
                        className="text-red-600 hover:text-red-900"
                        >
                        <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Species Details' : 'Register New Species'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Common Name</label>
                  <input 
                    type="text" required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.commonName} onChange={(e) => setFormData({...formData, commonName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scientific Name</label>
                  <input 
                    type="text" required className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    value={formData.scientificName} onChange={(e) => setFormData({...formData, scientificName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    className="w-full border border-gray-300 p-2 rounded-lg" value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {['Mammal', 'Bird', 'Reptile', 'Amphibian', 'Fish', 'Invertebrate', 'Plant'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conservation Status</label>
                  <select 
                    className="w-full border border-gray-300 p-2 rounded-lg" value={formData.conservationStatus}
                    onChange={(e) => setFormData({...formData, conservationStatus: e.target.value})}
                  >
                    {['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'].map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  rows="3" className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  {editingId ? 'Update Species' : 'Save Species'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



export default SpeciesManagement;