import React from 'react';

interface SurveyProjectItemProps {
  project: {
    id: string;
    title: string;
    templateType: string;
    date: string;
    status: 'active' | 'completed' | 'draft';
    isSelected: boolean;
  };
  onSelect: (projectId: string) => void;
}

const SurveyProjectItem: React.FC<SurveyProjectItemProps> = ({ project, onSelect }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '진행중';
      case 'completed':
        return '완료';
      case 'draft':
        return '초안';
      default:
        return '알 수 없음';
    }
  };

  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
        project.isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={() => onSelect(project.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className={`font-medium text-sm ${
          project.isSelected ? 'text-blue-900' : 'text-gray-900'
        }`}>
          {project.title}
        </h3>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(project.status)}`}>
          {getStatusText(project.status)}
        </span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <p>{project.templateType}</p>
        <p>생성일: {project.date}</p>
      </div>
      
      {project.isSelected && (
        <div className="mt-3 pt-2 border-t border-blue-200">
          <div className="flex items-center text-xs text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            선택됨
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyProjectItem;
