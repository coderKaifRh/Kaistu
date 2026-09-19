import React, { useState, useEffect } from 'react';
import type { Subject, StudyFolder, StudyItem } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/layout/Sidebar';
import { SubjectDetailView } from './components/subjects/SubjectDetailView';
import { Workstation } from './components/layout/Workstation';
import { SubjectModal } from './components/subjects/SubjectModal';
import { AddItemModal } from './components/subjects/AddItemModal';
import { AiHubModal } from './components/ai/AiHubModal';
import { CoursesHeroView } from './components/home/CoursesHeroView';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'subject'>('home');
  const [folders, setFolders] = useState<StudyFolder[]>([]);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [activeItem, setActiveItem] = useState<StudyItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [activeTargetFolderId, setActiveTargetFolderId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<StudyItem | null>(null);
  const [isAiHubOpen, setIsAiHubOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load initial data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const subs = await StorageService.getSubjects();
      setSubjects(subs);
      const allFolders = await StorageService.getFolders();
      setFolders(allFolders);
      const allItems = await StorageService.getAllItems();
      setItems(allItems);

      if (subs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subs[0].id);
      }
    } catch (e) {
      console.error('Failed to load initial KaiStu data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handlePopState = () => {
      // Return to workstation/dashboard
      if (activeItem) {
        setActiveItem(null);
      } else {
        setActiveView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeItem]);

  const openItemInWorkstation = (item: StudyItem) => {
    setActiveItem(item);
    window.history.pushState({ workstation: true, itemId: item.id }, '', `#item-${item.id}`);
  };

  const closeWorkstation = () => {
    setActiveItem(null);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleSaveSubject = async (subject: Subject) => {
    await StorageService.saveSubject(subject);
    const updatedSubs = await StorageService.getSubjects();
    setSubjects(updatedSubs);
    setSelectedSubjectId(subject.id);
    setActiveView('subject');
  };

  const handleDeleteSubject = async (id: string) => {
    await StorageService.deleteSubject(id);
    const updatedSubs = await StorageService.getSubjects();
    setSubjects(updatedSubs);
    const updatedFolders = await StorageService.getFolders();
    setFolders(updatedFolders);
    const updatedItems = await StorageService.getAllItems();
    setItems(updatedItems);

    if (selectedSubjectId === id) {
      setSelectedSubjectId(updatedSubs.length > 0 ? updatedSubs[0].id : null);
      closeWorkstation();
    }
  };

  const handleSaveFolder = async (folder: StudyFolder) => {
    await StorageService.saveFolder(folder);
    const updatedFolders = await StorageService.getFolders();
    setFolders(updatedFolders);
  };

  const handleDeleteFolder = async (folderId: string) => {
    await StorageService.deleteFolder(folderId);
    const updatedFolders = await StorageService.getFolders();
    setFolders(updatedFolders);
    const updatedItems = await StorageService.getAllItems();
    setItems(updatedItems);
  };

  const handleUpdateItem = async (updated: StudyItem) => {
    await StorageService.saveItem(updated);
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (activeItem?.id === updated.id) {
      setActiveItem(updated);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await StorageService.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (activeItem?.id === id) {
      closeWorkstation();
    }
  };

  const handleItemSaved = async (savedItem: StudyItem) => {
    if (editingItem) {
      await handleUpdateItem(savedItem);
    } else {
      setItems((prev) => [savedItem, ...prev]);
      openItemInWorkstation(savedItem);
    }
    setEditingItem(null);
    setActiveTargetFolderId(null);
  };

  const handleOpenAiAssist = (contextPrompt: string) => {
    setAiInitialPrompt(contextPrompt);
    setIsAiHubOpen(true);
  };

  const handleExportData = async () => {
    const jsonStr = await StorageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KaiStu_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Counts of items for each subject
  const itemCountsBySubject = subjects.reduce((acc, sub) => {
    acc[sub.id] = items.filter((i) => i.subjectId === sub.id).length;
    return acc;
  }, {} as Record<string, number>);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || (subjects.length > 0 ? subjects[0] : null);
  const subjectItems = selectedSubjectId ? items.filter((i) => i.subjectId === selectedSubjectId) : [];

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <h2 className="text-base font-semibold tracking-tight">Launching KaiStu Workstation...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* If an item is active, render full Workstation mode */}
      {activeItem && activeSubject ? (
        <Workstation
          subject={activeSubject}
          item={activeItem}
          allItems={subjectItems}
          onBack={closeWorkstation}
          onUpdateItem={handleUpdateItem}
          onSelectItem={(it) => openItemInWorkstation(it)}
          onOpenAiAssist={handleOpenAiAssist}
          onAddNewMaterial={() => {
            setEditingItem(null);
            setIsAddItemModalOpen(true);
          }}
          onEditItem={(it) => {
            setEditingItem(it);
            setIsAddItemModalOpen(true);
          }}
          onDeleteItem={handleDeleteItem}
        />
      ) : activeView === 'home' ? (
        <CoursesHeroView
          subjects={subjects}
          items={items}
          folders={folders}
          onSelectSubject={(id) => {
            setSelectedSubjectId(id);
            setActiveView('subject');
          }}
          onOpenItem={(item) => openItemInWorkstation(item)}
          onAddSubject={() => setIsSubjectModalOpen(true)}
          onDeleteSubject={(id) => handleDeleteSubject(id)}
          onOpenAiHub={() => {
            setAiInitialPrompt(undefined);
            setIsAiHubOpen(true);
          }}
          onExportData={handleExportData}
        />
      ) : (
        /* Standard Dashboard Layout with Sidebar & Subject Details */
        <div className="flex w-full h-full relative overflow-hidden">
          {/* Mobile backdrop for drawer */}
          {isMobileSidebarOpen && (
            <div
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            />
          )}

          {/* Sidebar Drawer */}
          <div
            className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:relative md:translate-x-0 ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            }`}
          >
            <Sidebar
              subjects={subjects}
              selectedSubjectId={selectedSubjectId}
              onSelectSubject={(id) => {
                setSelectedSubjectId(id);
                setActiveView('subject');
                closeWorkstation();
                setIsMobileSidebarOpen(false);
              }}
              onAddSubject={() => setIsSubjectModalOpen(true)}
              onDeleteSubject={handleDeleteSubject}
              onOpenAiHub={() => {
                setAiInitialPrompt(undefined);
                setIsAiHubOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onExportData={handleExportData}
              itemCountsBySubject={itemCountsBySubject}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
              onBackToCourses={() => {
                setActiveView('home');
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>

          <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {activeSubject ? (
              <SubjectDetailView
                subject={activeSubject}
                items={subjectItems}
                folders={folders}
                onBack={() => setActiveView('home')}
                onSelectItem={(item) => openItemInWorkstation(item)}
                onAddNewMaterial={(folderId) => {
                  setActiveTargetFolderId(folderId || null);
                  setEditingItem(null);
                  setIsAddItemModalOpen(true);
                }}
                onDeleteItem={handleDeleteItem}
                onEditItem={(it) => {
                  setEditingItem(it);
                  setActiveTargetFolderId(it.folderId || null);
                  setIsAddItemModalOpen(true);
                }}
                onSaveFolder={handleSaveFolder}
                onDeleteFolder={handleDeleteFolder}
                onOpenAiAssist={handleOpenAiAssist}
                onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <h2 className="text-xl font-bold text-white mb-2">Welcome to KaiStu</h2>
                <p className="text-sm max-w-sm mb-4">
                  Create your first subject to organize all your PDFs, YouTube lectures, Word docs, and notes in one place.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveView('home')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg transition"
                  >
                    View Our Courses
                  </button>
                  <button
                    onClick={() => setIsSubjectModalOpen(true)}
                    className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10 rounded-xl text-xs font-semibold transition"
                  >
                    Create New Subject
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Global Modals */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleSaveSubject}
      />

      {selectedSubjectId && (
        <AddItemModal
          isOpen={isAddItemModalOpen}
          onClose={() => {
            setIsAddItemModalOpen(false);
            setEditingItem(null);
            setActiveTargetFolderId(null);
          }}
          subjectId={selectedSubjectId}
          folderId={activeTargetFolderId}
          folderName={
            activeTargetFolderId
              ? folders.find((f) => f.id === activeTargetFolderId)?.name
              : undefined
          }
          onItemAdded={handleItemSaved}
          initialItem={editingItem}
          onDeleteItem={handleDeleteItem}
        />
      )}

      <AiHubModal
        isOpen={isAiHubOpen}
        onClose={() => setIsAiHubOpen(false)}
        initialPrompt={aiInitialPrompt}
      />
    </div>
  );
};

export default App;
