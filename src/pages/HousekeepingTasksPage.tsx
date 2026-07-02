/** @jsxImportSource react */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Wrench,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  RefreshCw,
  CalendarDays,
  Users,
  LogIn,
  LogOut,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchClientHousekeepingTasks, HousekeepingTask } from '@/lib/housekeeping-api';

type TaskTypeFilter = 'all' | 'cleaning' | 'task' | 'maintenance';

function formatDateLabel(value: string): string {
  if (!value) return '';
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'EEEE d MMMM yyyy', { locale: fr }) : value;
}

function formatShortDate(value: string): string {
  if (!value) return '';
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'd MMM', { locale: fr }) : value;
}

function taskTypeMeta(type: string): { label: string; icon: React.ElementType; classes: string; dot: string } {
  switch (type.toLowerCase()) {
    case 'cleaning':
      return {
        label: 'Ménage',
        icon: Sparkles,
        classes: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
        dot: 'bg-blue-500',
      };
    case 'maintenance':
      return {
        label: 'Maintenance',
        icon: Wrench,
        classes: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    default:
      return {
        label: 'Tâche',
        icon: ClipboardList,
        classes: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
        dot: 'bg-violet-500',
      };
  }
}

const HousekeepingTasksPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState<string>(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [taskType, setTaskType] = useState<TaskTypeFilter>('all');
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClientHousekeepingTasks({ dateFrom, dateTo, taskType });
      setTasks(result);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la récupération des tâches de ménage.');
      console.error('[housekeeping] fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, taskType]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter(
      (t) =>
        t.room.toLowerCase().includes(query) ||
        t.note.toLowerCase().includes(query) ||
        t.users.some((u) => u.toLowerCase().includes(query)),
    );
  }, [tasks, search]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const cleanings = tasks.filter((t) => t.taskType.toLowerCase() === 'cleaning').length;
    return { total, completed, pending: total - completed, cleanings };
  }, [tasks]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, HousekeepingTask[]>();
    filteredTasks.forEach((task) => {
      const key = task.dateScheduled || 'Sans date';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    });
    return Array.from(groups.entries());
  }, [filteredTasks]);

  const statCards = [
    { label: 'Total tâches', value: stats.total, icon: ClipboardList, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Terminées', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
    { label: 'À faire', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/40' },
    { label: 'Ménages', value: stats.cleanings, icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-950/40' },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute right-16 bottom-0 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Ménage & maintenance
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Tâches de ménage</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Suivez les ménages, maintenances et tâches planifiées sur vos logements.
              </p>
            </div>
            <Button variant="outline" onClick={loadTasks} disabled={loading} className="shrink-0 bg-background/70 backdrop-blur">
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat) => (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl shrink-0', stat.bg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  {loading ? (
                    <Skeleton className="h-6 w-12 mt-1" />
                  ) : (
                    <p className="text-xl font-bold leading-tight">{stat.value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col lg:flex-row gap-3 lg:items-end">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Du</label>
                <Input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Au</label>
                <Input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="w-full lg:w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as TaskTypeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="cleaning">Ménage</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="task">Tâche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full lg:w-[220px]">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Logement, note..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 flex items-center gap-4">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Aucune tâche sur cette période</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              Ajustez les dates ou le type pour afficher les ménages et maintenances planifiés.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByDate.map(([date, dayTasks]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold capitalize">{formatDateLabel(date)}</h2>
                  <Badge variant="secondary" className="ml-1">{dayTasks.length}</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {dayTasks.map((task) => {
                    const meta = taskTypeMeta(task.taskType);
                    const TypeIcon = meta.icon;
                    return (
                      <Card
                        key={`${task.id}-${task.idRoom}`}
                        className={cn(
                          'group relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                          task.completed
                            ? 'border-emerald-200 dark:border-emerald-900/50'
                            : 'border-border/60',
                        )}
                      >
                        {/* Accent bar */}
                        <div className={cn('absolute inset-y-0 left-0 w-1.5', task.completed ? 'bg-emerald-400' : meta.dot)} />

                        <CardContent className="p-4 sm:p-5 pl-6 sm:pl-7">
                          {/* Top row: icon + room + status */}
                          <div className="flex items-start gap-3">
                            <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 shadow-sm', meta.classes)}>
                              <TypeIcon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold truncate leading-tight flex items-center gap-1.5">
                                    <Home className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    {task.room || `Logement ${task.idRoom}`}
                                  </h3>
                                  <span className={cn('mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', meta.classes)}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                                    {meta.label}
                                  </span>
                                </div>

                                {task.completed ? (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Terminée
                                  </span>
                                ) : (
                                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 px-2.5 py-1 text-xs font-semibold">
                                    <Clock className="h-3.5 w-3.5" />
                                    À faire
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Time + users chips */}
                          {(task.timeScheduled || task.users.length > 0) && (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              {task.timeScheduled && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  {task.timeScheduled}
                                  {task.timeEnd ? ` – ${task.timeEnd}` : ''}
                                </span>
                              )}
                              {task.users.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium">
                                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                  {task.users.join(', ')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Note */}
                          {task.note && (
                            <p className="mt-3 text-sm text-foreground/80 bg-muted/50 rounded-lg px-3 py-2 border-l-2 border-border">
                              {task.note}
                            </p>
                          )}

                          {/* Next reservation info */}
                          {(task.nextArrivalDate || task.nextDepartureDate) && (
                            <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2">
                              {task.nextDepartureDate && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 px-2.5 py-1 text-xs font-medium">
                                  <LogOut className="h-3.5 w-3.5" />
                                  Départ {formatShortDate(task.nextDepartureDate)}
                                </span>
                              )}
                              {task.nextArrivalDate && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 px-2.5 py-1 text-xs font-medium">
                                  <LogIn className="h-3.5 w-3.5" />
                                  Arrivée {formatShortDate(task.nextArrivalDate)}
                                  {task.nextArrivalTime ? ` à ${task.nextArrivalTime}` : ''}
                                  {task.nextArrivalGuests ? ` · ${task.nextArrivalGuests} pers.` : ''}
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default HousekeepingTasksPage;
