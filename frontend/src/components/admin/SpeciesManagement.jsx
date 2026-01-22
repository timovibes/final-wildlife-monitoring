import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Navbar from '../shared/Navbar';
import authService from '../../services/auth';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';

const SpeciesManagement = () => {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getCurrentUser();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={currentUser} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Species Management</h1>
          <button className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
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
                    <button className="text-blue-600 hover:text-blue-900 mr-4">
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
    </div>
  );
};

export default SpeciesManagement;