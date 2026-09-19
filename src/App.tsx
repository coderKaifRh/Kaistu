import React, { useState, useEffect } from 'react';
import type { Subject, StudyItem } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/layout/Sidebar';
import { SubjectDetailView } from './components/subjects/SubjectDetailView';
import { Workstation } from './components/layout/Workstation';
import { SubjectModal } from './components/subjects/SubjectModal';
import { AddItemModal } from './components/subjects/AddItemModal';
import { AiHubModal } from './components/ai/AiHubModal';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [activeItem, setActiveItem] = useState<StudyItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isAiHubOpen, setIsAiHubOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);

  // Load initial data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const subs = await StorageService.getSubjects();
      setSubjects(subs);
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
  }, []);

  const handleSaveSubject = async (subject: Subject) => {
    await StorageService.saveSubject(subject);
    const updatedSubs = await StorageService.getSubjects();
    setSubjects(updatedSubs);
    setSelectedSubjectId(subject.id);
  };

  const handleDeleteSubject = async (id: string) => {
    await StorageService.deleteSubject(id);
    const updatedSubs = await StorageService.getSubjects();
    setSubjects(updatedSubs);
    const updatedItems = await StorageService.getAllItems();
    setItems(updatedItems);

    if (selectedSubjectId === id) {
      setSelectedSubjectId(updatedSubs.length > 0 ? updatedSubs[0].id : null);
      setActiveItem(null);
    }
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
      setActiveItem(null);
    }
  };

  const handleItemAdded = async (newItem: StudyItem) => {
    setItems((prev) => [newItem, ...prev]);
    // Automatically open the newly added material in the Workstation!
    setActiveItem(newItem);
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

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const subjectItems = items.filter((i) => i.subjectId === selectedSubjectId);

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
          onBack={() => setActiveItem(null)}
          onUpdateItem={handleUpdateItem}
          onSelectItem={(it) => setActiveItem(it)}
          onOpenAiAssist={handleOpenAiAssist}
          onAddNewMaterial={() => setIsAddItemModalOpen(true)}
        />
      ) : (
        /* Standard Dashboard Layout with Sidebar & Subject Details */
        <>
          <Sidebar
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
            onSelectSubject={(id) => {
              setSelectedSubjectId(id);
              setActiveItem(null);
            }}
            onAddSubject={() => setIsSubjectModalOpen(true)}
            onDeleteSubject={handleDeleteSubject}
            onOpenAiHub={() => {
              setAiInitialPrompt(undefined);
              setIsAiHubOpen(true);
            }}
            onExportData={handleExportData}
            itemCountsBySubject={itemCountsBySubject}
          />

          <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {activeSubject ? (
              <SubjectDetailView
                subject={activeSubject}
                items={subjectItems}
                onBack={() => {}}
                onSelectItem={(item) => setActiveItem(item)}
                onAddNewMaterial={() => setIsAddItemModalOpen(true)}
                onDeleteItem={handleDeleteItem}
                onOpenAiAssist={handleOpenAiAssist}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <h2 className="text-xl font-bold text-white mb-2">Welcome to KaiStu</h2>
                <p className="text-sm max-w-sm mb-4">
                  Create your first subject to organize all your PDFs, YouTube lectures, Word docs, and notes in one place.
                </p>
                <button
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg transition"
                >
                  Create Your First Subject
                </button>
              </div>
            )}
          </main>
        </>
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
          onClose={() => setIsAddItemModalOpen(false)}
          subjectId={selectedSubjectId}
          onItemAdded={handleItemAdded}
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
