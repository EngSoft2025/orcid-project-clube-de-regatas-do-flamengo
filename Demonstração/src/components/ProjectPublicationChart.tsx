
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Publication, Project } from '../types';

interface ProjectPublicationChartProps {
  publications: Publication[];
  projects: Project[];
}

const ProjectPublicationChart = ({ publications, projects }: ProjectPublicationChartProps) => {
  // Group publications by year
  const publicationsByYear: Record<string, any> = {};
  
  // Initialize years
  const currentYear = new Date().getFullYear();
  for (let year = currentYear - 10; year <= currentYear; year++) {
    publicationsByYear[year] = { year };
    projects.forEach(project => {
      publicationsByYear[year][project.name] = 0;
    });
  }

  // Count publications by project and year
  publications.forEach(pub => {
    const year = pub.year.toString();
    if (pub.project && publicationsByYear[year]) {
      publicationsByYear[year][pub.project] = (publicationsByYear[year][pub.project] || 0) + 1;
    }
  });

  // Convert to array and sort by year
  const data = Object.values(publicationsByYear).sort((a: any, b: any) => 
    parseInt(a.year) - parseInt(b.year)
  );

  // Generate colors for projects
  const projectColors = [
    '#1E40AF', // dark blue
    '#3B82F6', // blue
    '#60A5FA', // light blue
    '#93C5FD', // lighter blue
    '#BFDBFE', // lightest blue
  ];

  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
        >
          <XAxis dataKey="year" />
          <YAxis allowDecimals={false} />
          <Tooltip 
            formatter={(value, name) => [`${value} publicações`, name]} 
            labelFormatter={(value) => `Ano: ${value}`}
          />
          <Legend />
          {projects.map((project, index) => (
            <Line 
              key={project.id}
              type="monotone"
              dataKey={project.name}
              stroke={projectColors[index % projectColors.length]}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProjectPublicationChart;
