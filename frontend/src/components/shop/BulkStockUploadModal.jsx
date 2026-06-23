import React, { useState } from 'react';
import { X, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

/**
 * BulkStockUploadModal Component - Sprint5-Story-06
 * Modal for bulk stock updates via CSV upload
 */

export default function BulkStockUploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleDownloadTemplate = () => {
    const template = 'SKU,Stock\nSTAT-001,50\nSTAT-002,100\nSPRT-001,25';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-stock-update-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Validate headers
    if (!headers.includes('sku') || !headers.includes('stock')) {
      throw new Error('CSV must contain "SKU" and "Stock" columns');
    }

    const skuIndex = headers.indexOf('sku');
    const stockIndex = headers.indexOf('stock');

    const updates = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const sku = values[skuIndex];
      const stock = values[stockIndex];

      if (!sku) {
        errors.push({ line: i + 1, error: 'Missing SKU' });
        continue;
      }

      const stockNum = parseInt(stock);
      if (isNaN(stockNum) || stockNum < 0) {
        errors.push({ line: i + 1, sku, error: 'Invalid stock value' });
        continue;
      }

      updates.push({ sku, stock: stockNum });
    }

    return { updates, errors };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }

    setUploading(true);

    try {
      // Read and parse CSV file
      const text = await file.text();
      const { updates, errors: parseErrors } = parseCSV(text);

      if (updates.length === 0) {
        toast.error('No valid updates found in CSV file');
        setUploading(false);
        return;
      }

      // Send to backend
      const response = await api.post('/api/v2/shop/admin/inventory/bulk-update', {
        csvData: updates,
        reason: 'bulk_import',
        notes: `Bulk upload via CSV - ${updates.length} items`
      });

      const { successful, failed } = response.data.results;

      // Set results
      setResults({
        successful: successful || [],
        failed: [...(failed || []), ...parseErrors],
        totalProcessed: updates.length
      });

      if (successful.length > 0) {
        toast.success(`${successful.length} product(s) updated successfully`);
        if (failed.length === 0 && parseErrors.length === 0) {
          // All succeeded, close modal after delay
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      }

      if (failed.length > 0 || parseErrors.length > 0) {
        toast.error(`${failed.length + parseErrors.length} update(s) failed`);
      }
    } catch (err) {
      console.error('Error uploading CSV:', err);
      if (err.message) {
        toast.error(err.message);
      } else {
        toast.error(err.response?.data?.message || 'Failed to process CSV file');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Bulk Stock Update</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={uploading}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!results ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download the CSV template below</li>
                  <li>Fill in the SKU and Stock columns</li>
                  <li>Upload the completed CSV file</li>
                  <li>Review the results</li>
                </ol>
              </div>

              {/* Download Template */}
              <div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-700 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download CSV Template
                </button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload CSV File <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="w-12 h-12 text-slate-400 mb-3" />
                    {file ? (
                      <div>
                        <p className="text-sm font-medium text-slate-900">{file.name}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Click to upload CSV file
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Only .csv files are supported
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* CSV Format Example */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">CSV Format Example:</p>
                <pre className="text-xs text-slate-600 font-mono bg-white p-3 rounded border border-slate-200 overflow-x-auto">
{`SKU,Stock
STAT-001,50
STAT-002,100
SPRT-001,25`}
                </pre>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={uploading}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Processing...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-blue-600 mb-1">Total Processed</p>
                  <p className="text-2xl font-bold text-blue-900">{results.totalProcessed}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600 mb-1">Successful</p>
                  <p className="text-2xl font-bold text-green-900">{results.successful.length}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{results.failed.length}</p>
                </div>
              </div>

              {/* Results Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {results.successful.map((item, index) => (
                        <tr key={`success-${index}`} className="bg-green-50">
                          <td className="px-4 py-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-slate-900">
                            {item.sku}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-700">
                            Stock updated to {item.newStock}
                          </td>
                        </tr>
                      ))}
                      {results.failed.map((item, index) => (
                        <tr key={`failed-${index}`} className="bg-red-50">
                          <td className="px-4 py-3">
                            {item.line ? (
                              <AlertCircle className="w-5 h-5 text-orange-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-slate-900">
                            {item.sku || `Line ${item.line}`}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-700">
                            {item.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Upload Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
