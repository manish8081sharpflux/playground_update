import React from 'react';
import { X, ZoomIn } from 'lucide-react';

export default function CourseImageViewer({ imageUrl, title, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>

                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
                >
                    <X size={32} />
                </button>

                <div className="bg-white p-2 rounded-xl shadow-2xl overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="max-h-[80vh] w-auto object-contain rounded-lg"
                    />
                </div>

                <div className="mt-4 bg-black bg-opacity-50 px-6 py-2 rounded-full text-white font-medium text-lg backdrop-blur-md border border-white/20">
                    {title}
                </div>
            </div>
        </div>
    );
}
