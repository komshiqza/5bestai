import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth, isAdmin } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Users, ShoppingCart, Edit, Loader2, Save } from "lucide-react";

// Types
interface CommissionInsights {
  totalCommission: { GLORY: number; SOL: string; USDC: string };
  totalSales: { GLORY: number; SOL: string; USDC: string };
  promptSalesCount: number;
  topSellers: Array<{
    userId: string;
    username: string;
    email: string;
    totalSales: number;
    totalCommission: number;
    customCommission: number | null;
  }>;
  defaultCommission: number;
}

// Schemas
const defaultCommissionSchema = z.object({
  commission: z.coerce.number().int().min(0).max(100),
});

const userCommissionSchema = z.object({
  commission: z.union([
    z.coerce.number().int().min(0).max(100),
    z.null(),
  ]),
});

type DefaultCommissionFormValues = z.infer<typeof defaultCommissionSchema>;
type UserCommissionFormValues = z.infer<typeof userCommissionSchema>;

const COLORS = {
  GLORY: "#FFD700",
  SOL: "#14F195",
  USDC: "#2775CA",
};

export default function AdminCommission() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CommissionInsights['topSellers'][0] | null>(null);

  // Redirect if not admin (only after auth loading completes)
  useEffect(() => {
    if (!isAuthLoading && (!user || !isAdmin(user))) {
      setLocation("/");
    }
  }, [user, isAuthLoading, setLocation]);

  // Show loading while auth is loading
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  // If not admin, don't render (redirect will happen via useEffect)
  if (!user || !isAdmin(user)) {
    return null;
  }

  // Fetch commission insights
  const { data: insights, isLoading } = useQuery<{ data: CommissionInsights }>({
    queryKey: ["/api/admin/commission/insights"],
  });

  const insightsData = insights?.data;

  // Calculate total seller earnings
  const totalSellerEarnings = insightsData ? {
    GLORY: insightsData.totalSales.GLORY - insightsData.totalCommission.GLORY,
    SOL: (parseFloat(insightsData.totalSales.SOL) - parseFloat(insightsData.totalCommission.SOL)).toFixed(9),
    USDC: (parseFloat(insightsData.totalSales.USDC) - parseFloat(insightsData.totalCommission.USDC)).toFixed(6),
  } : null;

  // Prepare chart data
  const revenueChartData = insightsData ? [
    { currency: "GLORY", amount: insightsData.totalSales.GLORY },
    { currency: "SOL", amount: parseFloat(insightsData.totalSales.SOL) },
    { currency: "USDC", amount: parseFloat(insightsData.totalSales.USDC) },
  ] : [];

  const commissionPieData = insightsData ? [
    { name: "GLORY", value: insightsData.totalCommission.GLORY },
    { name: "SOL", value: parseFloat(insightsData.totalCommission.SOL) },
    { name: "USDC", value: parseFloat(insightsData.totalCommission.USDC) },
  ].filter(item => item.value > 0) : [];

  // Forms
  const defaultCommissionForm = useForm<DefaultCommissionFormValues>({
    resolver: zodResolver(defaultCommissionSchema),
    values: {
      commission: insightsData?.defaultCommission || 20,
    },
  });

  const userCommissionForm = useForm<UserCommissionFormValues>({
    resolver: zodResolver(userCommissionSchema),
    values: {
      commission: selectedUser?.customCommission ?? null,
    },
  });

  // Update default commission mutation
  const updateDefaultCommissionMutation = useMutation({
    mutationFn: async (values: DefaultCommissionFormValues) => {
      const res = await apiRequest("PATCH", "/api/admin/commission/default", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission/insights"] });
      toast({
        title: "Успешно обновяване",
        description: "Комисионната по подразбиране беше обновена успешно.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Грешка",
        description: error.message || "Неуспешно обновяване на комисионната.",
        variant: "destructive",
      });
    },
  });

  // Update user commission mutation
  const updateUserCommissionMutation = useMutation({
    mutationFn: async ({ userId, commission }: { userId: string; commission: number | null }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/commission`, { commission });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission/insights"] });
      setEditDialogOpen(false);
      toast({
        title: "Успешно обновяване",
        description: "Комисионната на потребителя беше обновена успешно.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Грешка",
        description: error.message || "Неуспешно обновяване на комисионната.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: CommissionInsights['topSellers'][0]) => {
    setSelectedUser(user);
    userCommissionForm.reset({ commission: user.customCommission ?? null });
    setEditDialogOpen(true);
  };

  const onDefaultCommissionSubmit = (values: DefaultCommissionFormValues) => {
    updateDefaultCommissionMutation.mutate(values);
  };

  const onUserCommissionSubmit = (values: UserCommissionFormValues) => {
    if (!selectedUser) return;
    updateUserCommissionMutation.mutate({
      userId: selectedUser.userId,
      commission: values.commission,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-commission-title">
            Управление на комисионни
          </h1>
          <p className="text-muted-foreground">
            Управлявайте комисионните от продажби на промпти
          </p>
        </div>

        <Tabs defaultValue="insights" className="space-y-6" data-testid="commission-tabs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights" data-testid="tab-insights">
              <TrendingUp className="w-4 h-4 mr-2" />
              Статистики
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <DollarSign className="w-4 h-4 mr-2" />
              Настройки
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Потребителски комисионни
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6" data-testid="insights-tab">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <Card data-testid="card-total-revenue">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Общи приходи
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold" data-testid="text-revenue-glory">
                      {insightsData?.totalSales.GLORY || 0} GLORY
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div data-testid="text-revenue-sol">{insightsData?.totalSales.SOL || "0"} SOL</div>
                      <div data-testid="text-revenue-usdc">{insightsData?.totalSales.USDC || "0"} USDC</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Platform Commission */}
              <Card data-testid="card-total-commission">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Комисионна на платформата
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold" data-testid="text-commission-glory">
                      {insightsData?.totalCommission.GLORY || 0} GLORY
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div data-testid="text-commission-sol">{insightsData?.totalCommission.SOL || "0"} SOL</div>
                      <div data-testid="text-commission-usdc">{insightsData?.totalCommission.USDC || "0"} USDC</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Seller Earnings */}
              <Card data-testid="card-seller-earnings">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Печалби на продавачи
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="text-2xl font-bold" data-testid="text-earnings-glory">
                      {totalSellerEarnings?.GLORY || 0} GLORY
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div data-testid="text-earnings-sol">{totalSellerEarnings?.SOL || "0"} SOL</div>
                      <div data-testid="text-earnings-usdc">{totalSellerEarnings?.USDC || "0"} USDC</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Purchases */}
              <Card data-testid="card-total-purchases">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Общо продажби
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-purchases-count">
                    {insightsData?.promptSalesCount || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    продажби на промпти
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Bar Chart */}
              <Card data-testid="card-revenue-chart">
                <CardHeader>
                  <CardTitle>Приходи по валута</CardTitle>
                  <CardDescription>Общи приходи от продажби на промпти</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="currency" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="amount" fill="#8884d8" name="Сума">
                        {revenueChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.currency as keyof typeof COLORS]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Commission Pie Chart */}
              <Card data-testid="card-commission-chart">
                <CardHeader>
                  <CardTitle>Разпределение на комисионни</CardTitle>
                  <CardDescription>Комисионни по валута</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={commissionPieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value.toFixed(entry.name === 'GLORY' ? 0 : entry.name === 'SOL' ? 4 : 2)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {commissionPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6" data-testid="settings-tab">
            <Card>
              <CardHeader>
                <CardTitle>Комисионна по подразбиране</CardTitle>
                <CardDescription>
                  Задайте процент на комисионна по подразбиране за всички продажби на промпти
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...defaultCommissionForm}>
                  <form onSubmit={defaultCommissionForm.handleSubmit(onDefaultCommissionSubmit)} className="space-y-4">
                    <FormField
                      control={defaultCommissionForm.control}
                      name="commission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Комисионна (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="20"
                              {...field}
                              data-testid="input-default-commission"
                            />
                          </FormControl>
                          <FormDescription>
                            Въведете число между 0 и 100. Текущата комисионна: {insightsData?.defaultCommission || 20}%
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateDefaultCommissionMutation.isPending}
                        data-testid="button-save-default-commission"
                      >
                        {updateDefaultCommissionMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Запазване...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Запази
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Commissions Tab */}
          <TabsContent value="users" className="space-y-6" data-testid="users-tab">
            <Card>
              <CardHeader>
                <CardTitle>Потребителски комисионни</CardTitle>
                <CardDescription>
                  Управлявайте индивидуални комисионни за топ продавачи
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insightsData?.topSellers && insightsData.topSellers.length > 0 ? (
                  <Table data-testid="table-user-commissions">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Потребител</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Общи продажби</TableHead>
                        <TableHead className="text-right">Комисионна (%)</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insightsData.topSellers.map((seller) => (
                        <TableRow key={seller.userId} data-testid={`row-user-${seller.userId}`}>
                          <TableCell className="font-medium" data-testid={`text-username-${seller.userId}`}>
                            {seller.username}
                          </TableCell>
                          <TableCell data-testid={`text-email-${seller.userId}`}>
                            {seller.email}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-sales-${seller.userId}`}>
                            {seller.totalSales}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-commission-${seller.userId}`}>
                            {seller.customCommission ?? insightsData.defaultCommission}%
                            {seller.customCommission !== null && (
                              <span className="text-xs text-muted-foreground ml-1">(custom)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(seller)}
                              data-testid={`button-edit-${seller.userId}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Няма потребители с продажби на промпти
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit User Commission Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent data-testid="dialog-edit-user-commission">
            <DialogHeader>
              <DialogTitle>Редактирай комисионна</DialogTitle>
              <DialogDescription>
                Задайте индивидуална комисионна за {selectedUser?.username}. Оставете празно за комисионна по подразбиране.
              </DialogDescription>
            </DialogHeader>
            <Form {...userCommissionForm}>
              <form onSubmit={userCommissionForm.handleSubmit(onUserCommissionSubmit)} className="space-y-4">
                <FormField
                  control={userCommissionForm.control}
                  name="commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Комисионна (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder={`По подразбиране: ${insightsData?.defaultCommission || 20}%`}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                          data-testid="input-user-commission"
                        />
                      </FormControl>
                      <FormDescription>
                        Въведете число между 0 и 100, или оставете празно за комисионна по подразбиране ({insightsData?.defaultCommission || 20}%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Отказ
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserCommissionMutation.isPending}
                    data-testid="button-save-user-commission"
                  >
                    {updateUserCommissionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Запазване...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Запази
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
