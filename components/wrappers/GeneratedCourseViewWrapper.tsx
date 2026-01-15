import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchGeneratedCourseById } from '../../services/curriculumApi';
import GeneratedCourseView from '../features/ai/GeneratedCourseView';
import { GeneratedCourse, ViewState } from '../../types';

const GeneratedCourseViewWrapper: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
        setError("No course ID provided");
        setLoading(false);
        return;
    }

    fetchGeneratedCourseById(courseId)
      .then(setCourse)
      .catch((err) => {
        console.error(err);
        setError("Failed to load course");
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <div className="p-12 text-center">Loading course...</div>;
  if (error || !course) return (
    <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-red-500">{error || "Course not found"}</h2>
        <button onClick={() => navigate('/my-content')} className="mt-4 btn btn-primary">Back to My Content</button>
    </div>
  );

  return (
    <GeneratedCourseView
      course={course}
      onBack={() => navigate('/my-content')}
      onStartLesson={() => navigate(`/generated-lesson/${course.id}`)}
    />
  );
};

export default GeneratedCourseViewWrapper;
