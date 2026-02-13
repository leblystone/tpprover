import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, RefreshCw } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { generateId } from '../../utils/string';
import Modal from '../../components/common/Modal';

export default function AdminContent() {
  const { theme } = useOutletContext();
  const { contentData, setContentData, loadContentData, saveContentData } = useAdmin();
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingPenType, setEditingPenType] = useState(null);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={loadContentData}
          className="p-2.5 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: theme.primary + '15', border: `1px solid ${theme.primary}30`, color: theme.primary }}
          title="Reload"
        >
          <RefreshCw size={18} />
        </button>
        <button
          type="button"
          onClick={saveContentData}
          className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
        >
          <Save size={18} />
          Save All Changes
        </button>
      </div>

      <div className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Research Topics (Glossary)</h2>
            <p className="text-sm mt-1" style={{ color: theme.textLight }}>Manage research topics shown in the glossary and global search.</p>
          </div>
          <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
            {(contentData?.topics ?? []).length} topics
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter a new research topic…"
              value={contentData?.newTopic ?? ''}
              onChange={(e) => setContentData((prev) => ({ ...prev, newTopic: e.target.value }))}
              className="flex-1 p-3 rounded border"
              style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (contentData?.newTopic ?? '').trim()) {
                  setContentData((prev) => ({
                    ...prev,
                    topics: [...(prev?.topics ?? []), { id: generateId(), name: (prev?.newTopic ?? '').trim() }],
                    newTopic: '',
                  }));
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const v = (contentData?.newTopic ?? '').trim();
                if (!v) return;
                setContentData((prev) => ({
                  ...prev,
                  topics: [...(prev?.topics ?? []), { id: generateId(), name: v }],
                  newTopic: '',
                }));
              }}
              className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={18} />
              Add
            </button>
          </div>
          <div className="space-y-2">
            {!(contentData?.topics ?? []).length ? (
              <p className="text-center py-8" style={{ color: theme.textLight }}>No research topics yet. Add some above!</p>
            ) : (
              (contentData?.topics ?? []).map((topic) => (
                <div key={topic.id} className="flex items-center justify-between p-3 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                  <span style={{ color: theme.text }}>{topic.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTopic({ ...topic })}
                      className="p-1 hover:opacity-70"
                      style={{ color: theme.info }}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentData((prev) => ({ ...prev, topics: (prev?.topics ?? []).filter((t) => t.id !== topic.id) }))}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Pen Types</h2>
            <p className="text-sm mt-1" style={{ color: theme.textLight }}>Manage pen brands/types shown in protocol editor dropdown.</p>
          </div>
          <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
            {(contentData?.penTypes ?? []).length} types
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter a pen type (e.g., Omnipod, Mounjaro Pen)…"
              value={contentData?.newPenType ?? ''}
              onChange={(e) => setContentData((prev) => ({ ...prev, newPenType: e.target.value }))}
              className="flex-1 p-3 rounded border"
              style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (contentData?.newPenType ?? '').trim()) {
                  setContentData((prev) => ({
                    ...prev,
                    penTypes: [...(prev?.penTypes ?? []), { id: generateId(), name: (prev?.newPenType ?? '').trim() }],
                    newPenType: '',
                  }));
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const v = (contentData?.newPenType ?? '').trim();
                if (!v) return;
                setContentData((prev) => ({
                  ...prev,
                  penTypes: [...(prev?.penTypes ?? []), { id: generateId(), name: v }],
                  newPenType: '',
                }));
              }}
              className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={18} />
              Add
            </button>
          </div>
          <div className="space-y-2">
            {!(contentData?.penTypes ?? []).length ? (
              <p className="text-center py-8" style={{ color: theme.textLight }}>No pen types yet. Add some above!</p>
            ) : (
              (contentData?.penTypes ?? []).map((pen) => (
                <div key={pen.id} className="flex items-center justify-between p-3 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                  <span style={{ color: theme.text }}>{pen.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPenType({ ...pen })}
                      className="p-1 hover:opacity-70"
                      style={{ color: theme.info }}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentData((prev) => ({ ...prev, penTypes: (prev?.penTypes ?? []).filter((p) => p.id !== pen.id) }))}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {editingTopic && (
        <Modal open={!!editingTopic} onClose={() => setEditingTopic(null)} title="Edit Research Topic" theme={theme}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: theme.text }}>Topic Name</label>
            <input
              type="text"
              value={editingTopic.name ?? ''}
              onChange={(e) => setEditingTopic((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
            />
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditingTopic(null)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setContentData((prev) => ({
                    ...prev,
                    topics: (prev?.topics ?? []).map((t) => (t.id === editingTopic.id ? editingTopic : t)),
                  }));
                  setEditingTopic(null);
                  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Topic updated. Save changes when ready.', type: 'success' } }));
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Update
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editingPenType && (
        <Modal open={!!editingPenType} onClose={() => setEditingPenType(null)} title="Edit Pen Type" theme={theme}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: theme.text }}>Name</label>
            <input
              type="text"
              value={editingPenType.name ?? ''}
              onChange={(e) => setEditingPenType((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
            />
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditingPenType(null)}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setContentData((prev) => ({
                    ...prev,
                    penTypes: (prev?.penTypes ?? []).map((p) => (p.id === editingPenType.id ? editingPenType : p)),
                  }));
                  setEditingPenType(null);
                  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Pen type updated. Save changes when ready.', type: 'success' } }));
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Update
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
