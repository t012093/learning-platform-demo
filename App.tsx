import React, { useState } from 'react';
import { ViewState, GeneratedCourse, Course } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { fetchGeneratedCourseById, saveGeneratedCourse } from './services/curriculumApi';

// Common Components
import Layout from './components/common/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoginView from './components/common/LoginView';
import LandingView from './components/common/LandingView';
import LoginModal from './components/common/LoginModal';
import LessonView from './components/common/LessonView';
import Library from './components/common/Library';

// Dashboard Features
import Dashboard from './components/features/dashboard/Dashboard';
import CourseList from './components/features/dashboard/CourseList';
import CoursePathView from './components/features/dashboard/CoursePathView';
import LearningHub from './components/features/dashboard/LearningHub';
import ProfilePassport from './components/features/dashboard/ProfilePassport';
import MyContent from './components/features/dashboard/MyContent';

// Common Floating Components
import { FloatingChatbot } from './components/common/FloatingChatbot';

// AI Features
import CourseGeneratorView from './components/features/ai/CourseGeneratorView';
import GeneratedCourseView from './components/features/ai/GeneratedCourseView';
import GeneratedLessonView from './components/features/ai/GeneratedLessonView';
import LuminaConciergeView from './components/features/ai/LuminaConciergeView';
import BlenderChecklistGeneratorView from './components/features/ai/BlenderChecklistGeneratorView';
import PersonalAssessmentView from './components/features/dashboard/assessment/PersonalAssessmentView';
import AICharacterIntroView from './components/features/ai/AICharacterIntroView';
import AICharacterDetailView from './components/features/ai/AICharacterDetailView';

// Blender Features
import BlenderCurriculum from './components/features/blender/BlenderCurriculum';
import BlenderPathView from './components/features/blender/BlenderPathView';
import BlenderLessonView from './components/features/blender/BlenderLessonView';
import TeacherBotLiveView from './components/features/blender/TeacherBotLiveView';

// Programming Features
import ProgrammingCurriculum from './components/features/programming/ProgrammingCurriculum';
import ProgrammingCourseView from './components/features/programming/ProgrammingCourseView';
import PythonBeginnerView from './components/features/programming/PythonBeginnerView';
import HtmlCssView from './components/features/programming/HtmlCssView';
import HtmlCssPathView from './components/features/programming/HtmlCssPathView';
import HtmlCssPartTwoView from './components/features/programming/HtmlCssPartTwoView';
import WebInspectorView from './components/features/programming/WebInspectorView';
import VibePrologueView from './components/features/programming/VibePrologueView';
import VibeChapterOneView from './components/features/programming/VibeChapterOneView';
import VibeChapterTwoView from './components/features/programming/VibeChapterTwoView';
import VibeChapterThreeView from './components/features/programming/VibeChapterThreeView';
import VibeChapterFourView from './components/features/programming/VibeChapterFourView';
import VibeChapterFiveView from './components/features/programming/VibeChapterFiveView';
import VibeChapterSixView from './components/features/programming/VibeChapterSixView';
import VibeChapterSevenView from './components/features/programming/VibeChapterSevenView';
import VibeChapterEightView from './components/features/programming/VibeChapterEightView';
import VibeChapterNineView from './components/features/programming/VibeChapterNineView';
import VibeChapterTenView from './components/features/programming/VibeChapterTenView';
import VibeChapterElevenView from './components/features/programming/VibeChapterElevenView';
import VibeChapterZeroView from './components/features/programming/VibeChapterZeroView';
import VibePathView from './components/features/programming/VibePathView';
import UnityPathView from './components/features/programming/UnityPathView';
import UnityChapterView from './components/features/programming/UnityChapterView';

// Art Features
import ArtMuseumView from './components/features/art/ArtMuseumView';
import ArtHistoryView from './components/features/art/ArtHistoryView';
import ArtPeriodDetailView from './components/features/art/ArtPeriodDetailView';
import ArtKintsugiView from './components/features/art/ArtKintsugiView';
import ArtCurriculumView from './components/features/art/ArtCurriculumView';
import ArtIntroView from './components/features/art/ArtIntroView';
import ArtCraftsView from './components/features/art/ArtCraftsView';
import ArtCraftDetailView from './components/features/art/ArtCraftDetailView';
import ArtTribalView from './components/features/art/ArtTribalView';
import ArtTribalDetailView from './components/features/art/ArtTribalDetailView';

// Sonic Features
import SonicLabView from './components/features/sonic/SonicLabView';
import SonicSynthView from './components/features/sonic/SonicSynthView';

// P-School Feature
import PSchoolView from './components/features/PSchool/PSchoolView';

import { User, Settings, Bell, Shield } from 'lucide-react';

const ProfilePlaceholder: React.FC = () => (
  <div className="p-8 max-w-2xl mx-auto">
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="h-32 bg-indigo-600"></div>
      <div className="px-8 pb-8">
        <div className="relative -top-12 mb-[-12px] flex justify-between items-end">
          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
            <div className="w-full h-full bg-slate-200 rounded-full overflow-hidden">
              <img src="https://picsum.photos/200" alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Edit Profile</button>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mt-4">Alex Johnson</h1>
        <p className="text-slate-500">Passionate Learner • Level 12</p>

        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Settings size={20} /></div>
              <span className="font-medium text-slate-700">Account Settings</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Bell size={20} /></div>
              <span className="font-medium text-slate-700">Notifications</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-green-50 p-2 rounded-lg text-green-600"><Shield size={20} /></div>
              <span className="font-medium text-slate-700">Privacy & Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

import MultiFormatLessonView from './components/features/ai/MultiFormatLessonView';

const AppContent: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // AI Generated Course State
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [latestGeneratedForLibrary, setLatestGeneratedForLibrary] = useState<GeneratedCourse | null>(null);
  const [generatedCourseBackView, setGeneratedCourseBackView] = useState<ViewState>(ViewState.MY_CONTENT);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoginPageVisible, setIsLoginPageVisible] = useState(false);

  // Selected Craft/Tribal State
  const [selectedCraftId, setSelectedCraftId] = useState<string | null>(null);
  const [selectedTribalId, setSelectedTribalId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Blender State
  const [selectedBlenderStageId, setSelectedBlenderStageId] = useState<number>(1);

  const handleCourseSelect = async (course: Course) => {
    // 1. Route legacy/hardcoded courses to their dedicated views
    if (course.id === 'vibe-coding') {
        setCurrentView(ViewState.PROGRAMMING_VIBE);
        return;
    }
    if (course.id === 'blender-3d') {
        setCurrentView(ViewState.BLENDER); // Or BLENDER_PATH depending on entry preference
        return;
    }
    if (course.id === 'art-atelier') {
        setCurrentView(ViewState.ART_MUSEUM); // Entry point for Art
        return;
    }
    if (course.id === 'scratch-game') {
        setCurrentView(ViewState.P_SCHOOL);
        return;
    }
    if (course.id === 'unity-ai') {
        setCurrentView(ViewState.UNITY_AI_GAME_DEV);
        return;
    }
    if (course.id === 'web-basics') {
        setCurrentView(ViewState.PROGRAMMING_WEB);
        return;
    }
    if (course.id === 'gen-ai-camp') {
        setCurrentView(ViewState.PROGRAMMING_AI);
        return;
    }
    if (course.id === 'global-communication') {
        // English didn't have a dedicated full path view in imports, 
        // assuming generic or ViewState.COURSES was used.
        // If no dedicated view, fall through to generic.
    }

    // 2. Route AI generated courses to generic view
    // course.source is 'generated' for everything from DB now
    setGeneratedCourseBackView(ViewState.COURSES);
    try {
      const fullCourse = await fetchGeneratedCourseById(course.id);
      setGeneratedCourse(fullCourse);
      setCurrentView(ViewState.GENERATED_COURSE_PATH);
    } catch (error) {
      console.error('Failed to load generated course:', error);
    }
  };

  const handleStartLessonAttempt = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      setCurrentView(ViewState.LESSON);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    setCurrentView(ViewState.LESSON);
  };

  // Helper to navigate to a specific craft
  const handleCraftSelect = (craftId: string) => {
    setSelectedCraftId(craftId);
    if (craftId === 'kintsugi') {
      setCurrentView(ViewState.ART_KINTSUGI);
    } else {
      setCurrentView(ViewState.ART_CRAFT_DETAIL);
    }
  };

  // Helper to navigate to tribal section
  const handleTribalSelect = (chapterId: string) => {
    setSelectedTribalId(chapterId);
    setCurrentView(ViewState.ART_TRIBAL_DETAIL);
  };

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharacterId(charId);
    setCurrentView(ViewState.AI_CHARACTER_DETAIL);
  };

  const handleBlenderStageStart = (stageId: number) => {
    setSelectedBlenderStageId(stageId);
    setCurrentView(ViewState.BLENDER_LESSON);
  };
  
  const handleCourseGenerated = (course: GeneratedCourse) => {
    setGeneratedCourseBackView(ViewState.MY_CONTENT);
    setGeneratedCourse(course);
    setLatestGeneratedForLibrary(course);
    setCurrentView(ViewState.GENERATED_COURSE_PATH);

    saveGeneratedCourse(course).catch((error) => {
      console.error('Failed to save generated course:', error);
    });
  };

  const handleGeneratedCourseSelect = (course: GeneratedCourse) => {
    setGeneratedCourseBackView(ViewState.MY_CONTENT);
    setGeneratedCourse(course);
    setCurrentView(ViewState.GENERATED_COURSE_PATH);
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.MULTI_FORMAT_DEMO:
        return <MultiFormatLessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} />;
      case ViewState.DEMO_CONCEPT:
        return <MultiFormatLessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} forceBlockType="concept" />;
      case ViewState.DEMO_DIALOGUE:
        return <MultiFormatLessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} forceBlockType="dialogue" />;
      case ViewState.DEMO_WORKSHOP:
        return <MultiFormatLessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} forceSubType="code" />;
      case ViewState.DEMO_REFLECTION:
        return <MultiFormatLessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} forceBlockType="reflection" />;
      case ViewState.DEMO_BLENDER:
        return <MultiFormatLessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} forceSubType="blender" />;
      case ViewState.DEMO_CHECKLIST:
        return <MultiFormatLessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} forceBlockType="checklist" />;
      case ViewState.DEMO_CHECKLIST_GENERATOR:
        return <BlenderChecklistGeneratorView onBack={() => setCurrentView(ViewState.DASHBOARD)} />;
      case ViewState.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} />;
      case ViewState.COURSE_GENERATOR:
        return <CourseGeneratorView onBack={() => setCurrentView(ViewState.DASHBOARD)} onCourseGenerated={handleCourseGenerated} onNavigate={setCurrentView} />;
      case ViewState.LEARNING_HUB:
        return <LearningHub onNavigate={setCurrentView} />;
      case ViewState.COURSES:
        return <CourseList onSelectCourse={handleCourseSelect} />;
      case ViewState.COURSE_DETAILS:
        if (!selectedCourse) return <CourseList onSelectCourse={handleCourseSelect} />;
        return (
          <CoursePathView
            course={selectedCourse}
            onStartLesson={handleStartLessonAttempt}
            onBack={() => setCurrentView(ViewState.COURSES)}
          />
        );
      case ViewState.BLENDER:
        return <BlenderCurriculum onNavigate={setCurrentView} />;
      case ViewState.BLENDER_PATH:
        return <BlenderPathView
          onBack={() => setCurrentView(ViewState.BLENDER)}
          onStartLesson={handleBlenderStageStart}
        />;
      case ViewState.BLENDER_LESSON:
        return <BlenderLessonView
          stageId={selectedBlenderStageId}
          onBack={() => setCurrentView(ViewState.BLENDER_PATH)}
          onComplete={() => setCurrentView(ViewState.BLENDER_PATH)}
        />;
      case ViewState.TEACHER_BOT_LIVE:
        return <TeacherBotLiveView onBack={() => setCurrentView(ViewState.LEARNING_HUB)} />;
      case ViewState.PROGRAMMING:
      case ViewState.PROGRAMMING_WEB:
        return <ProgrammingCurriculum onNavigate={setCurrentView} initialTrack="web" />;
      case ViewState.PROGRAMMING_AI:
        return <ProgrammingCurriculum onNavigate={setCurrentView} initialTrack="ai" />;

      // Detailed Programming Paths
      case ViewState.PROGRAMMING_PATH:
        return <ProgrammingCourseView onBack={() => setCurrentView(ViewState.PROGRAMMING)} />;
      case ViewState.PYTHON_COURSE:
        return <PythonBeginnerView onBack={() => setCurrentView(ViewState.PROGRAMMING_AI)} />;
      case ViewState.HTML_CSS_PATH:
        return <HtmlCssPathView
          onBack={() => setCurrentView(ViewState.PROGRAMMING_WEB)}
          onNavigate={setCurrentView}
        />;
      case ViewState.HTML_CSS_COURSE:
        return <HtmlCssView onBack={() => setCurrentView(ViewState.HTML_CSS_PATH)} />;
      case ViewState.HTML_CSS_PART_TWO:
        return <HtmlCssPartTwoView onBack={() => setCurrentView(ViewState.HTML_CSS_PATH)} />;
      case ViewState.WEB_INSPECTOR:
        return <WebInspectorView onBack={() => setCurrentView(ViewState.HTML_CSS_PATH)} onNavigate={setCurrentView} />;

      case ViewState.PROGRAMMING_VIBE:
      case ViewState.VIBE_PATH:
        return <VibePathView
          onBack={() => setCurrentView(ViewState.LEARNING_HUB)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_PROLOGUE:
        return <VibePrologueView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_0:
        return <VibeChapterZeroView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_1:
        return <VibeChapterOneView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_2:
        return <VibeChapterTwoView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_3:
        return <VibeChapterThreeView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_4:
        return <VibeChapterFourView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_5:
        return <VibeChapterFiveView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_6:
        return <VibeChapterSixView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_7:
        return <VibeChapterSevenView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_8:
        return <VibeChapterEightView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_9:
        return <VibeChapterNineView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_10:
        return <VibeChapterTenView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.VIBE_CHAPTER_11:
        return <VibeChapterElevenView
          onBack={() => setCurrentView(ViewState.VIBE_PATH)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;

      // Unity AI Game Dev
      case ViewState.UNITY_AI_GAME_DEV:
        return <UnityPathView
          onBack={() => setCurrentView(ViewState.LEARNING_HUB)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;
      case ViewState.UNITY_CHAPTER_0:
      case ViewState.UNITY_CHAPTER_1:
      case ViewState.UNITY_CHAPTER_2:
      case ViewState.UNITY_CHAPTER_3:
        return <UnityChapterView
          viewState={currentView}
          onBack={() => setCurrentView(ViewState.UNITY_AI_GAME_DEV)}
          onNavigate={setCurrentView}
          language={language}
          setLanguage={setLanguage}
        />;

      // Art Routes
      case ViewState.ART_MUSEUM:
        return <ArtMuseumView onNavigate={setCurrentView} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_HISTORY:
        return <ArtHistoryView onBack={() => setCurrentView(ViewState.ART_MUSEUM)} onNavigate={setCurrentView} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_CURRICULUM:
        return <ArtCurriculumView onBack={() => setCurrentView(ViewState.ART_MUSEUM)} onNavigate={setCurrentView} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_INTRO:
        return <ArtIntroView onBack={() => setCurrentView(ViewState.ART_CURRICULUM)} onNavigate={setCurrentView} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_PERIOD_DETAIL:
        return <ArtPeriodDetailView onBack={() => setCurrentView(ViewState.ART_CURRICULUM)} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_CRAFTS:
        return <ArtCraftsView onBack={() => setCurrentView(ViewState.ART_MUSEUM)} onSelectCraft={handleCraftSelect} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_CRAFT_DETAIL:
        return <ArtCraftDetailView craftId={selectedCraftId || 'urushi'} onBack={() => setCurrentView(ViewState.ART_CRAFTS)} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_KINTSUGI:
        return <ArtKintsugiView onBack={() => setCurrentView(ViewState.ART_CRAFTS)} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_TRIBAL:
        return <ArtTribalView onBack={() => setCurrentView(ViewState.ART_MUSEUM)} onSelectChapter={handleTribalSelect} language={language} setLanguage={setLanguage} />;
      case ViewState.ART_TRIBAL_DETAIL:
        return <ArtTribalDetailView chapterId={selectedTribalId || 'intro'} onBack={() => setCurrentView(ViewState.ART_TRIBAL)} language={language} setLanguage={setLanguage} />;

      // Sonic Lab Routes
      case ViewState.SONIC_LAB:
        return <SonicLabView onNavigate={setCurrentView} />;
      case ViewState.SONIC_SYNTH:
        return <SonicSynthView onBack={() => setCurrentView(ViewState.SONIC_LAB)} />;
      
      case ViewState.P_SCHOOL:
        return <PSchoolView />;

      case ViewState.LIBRARY:
        return <Library />;

      case ViewState.AI_DIAGNOSIS:
        return <PersonalAssessmentView onNavigate={setCurrentView} />;

      // AI Characters
      case ViewState.AI_CHARACTERS:
        return <AICharacterIntroView onNavigate={setCurrentView} onSelectCharacter={handleCharacterSelect} />;
      case ViewState.AI_CHARACTER_DETAIL:
        return <AICharacterDetailView
          characterId={selectedCharacterId || 'openness'}
          onNavigate={setCurrentView}
          onBack={() => setCurrentView(ViewState.AI_CHARACTERS)}
        />;

      case ViewState.PROFILE:
        return <ProfilePassport onNavigate={setCurrentView} />;
      case ViewState.MY_CONTENT:
        return <MyContent onNavigate={setCurrentView} onSelectCourse={handleGeneratedCourseSelect} newCourseForLibrary={latestGeneratedForLibrary} />;
      case ViewState.GENERATED_COURSE_PATH:
        if (!generatedCourse) return <MyContent onNavigate={setCurrentView} onSelectCourse={handleGeneratedCourseSelect} />;
        return <GeneratedCourseView course={generatedCourse} onBack={() => setCurrentView(generatedCourseBackView)} onStartLesson={() => {
            console.log("App: Switching to GENERATED_LESSON_VIEW");
            setCurrentView(ViewState.GENERATED_LESSON_VIEW);
          }} />;
      case ViewState.GENERATED_LESSON_VIEW:
        if (generatedCourse?.preferredTemplate === 'workshop_split') {
             const allBlocks = generatedCourse.chapters.flatMap(ch => ch.blocks || []);
             return (
                <MultiFormatLessonView 
                    blocks={allBlocks} 
                    onBack={() => setCurrentView(ViewState.GENERATED_COURSE_PATH)} 
                />
             );
        }
        return <GeneratedLessonView course={generatedCourse} onBack={() => setCurrentView(ViewState.GENERATED_COURSE_PATH)} onComplete={() => setCurrentView(ViewState.GENERATED_COURSE_PATH)} />;
      case ViewState.LESSON:
        return <LessonView onBack={() => setCurrentView(ViewState.DASHBOARD)} />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <>
      {!isLoggedIn ? (
        isLoginPageVisible ?
          <LoginView onLoginSuccess={() => setIsLoggedIn(true)} /> :
          <LandingView onLoginClick={() => setIsLoginPageVisible(true)} />
      ) : (
        <>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={handleLoginSuccess} />
          <Layout currentView={currentView} onNavigate={setCurrentView}>
            {renderContent()}
          </Layout>
          <FloatingChatbot />
        </>
      )}
    </>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  </ErrorBoundary>
);

export default App;
