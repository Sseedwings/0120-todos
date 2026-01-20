
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Todo, Priority } from './types';
import { getTaskBreakdown, suggestPriority } from './geminiService';

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [breakdown, setBreakdown] = useState<{ id: string; steps: any[] } | null>(null);

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (supabaseError) {
        throw supabaseError;
      }
      setTodos(data || []);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    setLoading(true);
    try {
      const suggested = await suggestPriority(newTodo).catch(() => 'medium' as Priority);
      const { error: insertError } = await supabase.from('todos').insert([
        { title: newTodo, priority: suggested || 'medium' }
      ]);

      if (insertError) throw insertError;
      setNewTodo('');
      fetchTodos();
    } catch (err: any) {
      alert(`Error adding todo: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (todo: Todo) => {
    try {
      const { error: updateError } = await supabase
        .from('todos')
        .update({ is_completed: !todo.is_completed })
        .eq('id', todo.id);

      if (updateError) throw updateError;
      fetchTodos();
    } catch (err: any) {
      alert(`Error updating todo: ${err.message}`);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('todos').delete().eq('id', id);
      if (deleteError) throw deleteError;
      fetchTodos();
    } catch (err: any) {
      alert(`Error deleting todo: ${err.message}`);
    }
  };

  const handleAiBreakdown = async (todo: Todo) => {
    setAiLoading(todo.id);
    try {
      const result = await getTaskBreakdown(todo.title);
      setBreakdown({ id: todo.id, steps: result.steps });
    } catch (err) {
      alert('AI analysis failed. Please try again.');
    } finally {
      setAiLoading(null);
    }
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.is_completed;
    if (filter === 'completed') return t.is_completed;
    return true;
  });

  // 테이블이 존재하지 않을 때 발생하는 구체적인 에러 메시지들 체크
  const isTableMissing = error && (
    error.code === '42P01' || 
    error.message?.includes('not found') || 
    error.message?.includes('schema cache') ||
    error.status === 404
  );

  if (isTableMissing) {
    const sqlCode = `create table todos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  is_completed boolean default false,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  created_at timestamp with time zone default now(),
  due_date timestamp with time zone
);

alter table todos enable row level security;

create policy "Public Access" on todos
  for all using (true) with check (true);`;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8">
          <div className="flex items-center gap-4 mb-6 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold">Database Table Not Found</h1>
          </div>
          <p className="text-slate-600 mb-6 font-medium">
            Supabase에 <code>todos</code> 테이블이 생성되지 않았습니다. 
            아래 SQL 코드를 복사하여 Supabase의 <strong>SQL Editor</strong>에서 실행해 주세요.
          </p>
          <div className="bg-slate-900 rounded-xl p-6 mb-8 relative group">
            <pre className="text-indigo-300 text-sm overflow-x-auto font-mono whitespace-pre-wrap">
              {sqlCode}
            </pre>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(sqlCode);
                alert('SQL 코드가 클립보드에 복사되었습니다!');
              }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs transition-colors"
            >
              Copy SQL
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg"
            >
              SQL 실행 후 페이지 새로고침
            </button>
            <button 
              onClick={fetchTodos}
              className="w-full py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-semibold hover:bg-slate-50 transition-all"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 glass">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              AI Smart Todo Pro
            </h1>
          </div>
          <div className="text-sm font-medium text-slate-500">
            {todos.filter(t => !t.is_completed).length} Tasks Left
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 mt-8">
        {error && !isTableMissing && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Error: {error.message || 'Failed to connect to Supabase'}</span>
            </div>
            <button onClick={fetchTodos} className="text-xs font-bold text-red-600 underline">Retry</button>
          </div>
        )}

        <form onSubmit={addTodo} className="mb-8 group">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="What needs to be done?"
              className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm bg-white"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>

        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                filter === f 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {loading && todos.length === 0 ? (
            <div className="text-center py-20 text-slate-400">Loading tasks...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No tasks found</p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`bg-white rounded-2xl border border-slate-200 p-5 transition-all hover:shadow-md ${
                  todo.is_completed ? 'opacity-70 bg-slate-50' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleComplete(todo)}
                    className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      todo.is_completed 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-slate-300 hover:border-indigo-500'
                    }`}
                  >
                    {todo.is_completed && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${todo.is_completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {todo.title}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                        todo.priority === 'high' ? 'bg-red-100 text-red-600' :
                        todo.priority === 'medium' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {todo.priority}
                      </span>
                    </div>
                    
                    <div className="flex gap-4 mt-3">
                      <button
                        onClick={() => handleAiBreakdown(todo)}
                        disabled={!!aiLoading}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        {aiLoading === todo.id ? 'Thinking...' : 'AI Breakdown'}
                      </button>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                    {breakdown?.id === todo.id && (
                      <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-widest">AI Suggested Steps</h4>
                          <button onClick={() => setBreakdown(null)} className="text-indigo-400 hover:text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        {breakdown.steps.map((step, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="mt-1 w-4 h-4 rounded-full bg-indigo-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-indigo-700">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-indigo-900">{step.step}</p>
                              <p className="text-xs text-indigo-600/80">{step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
