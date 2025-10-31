import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { TrendingUp, DollarSign, Users } from "lucide-react";

interface PromptSalesStats {
  totalSales: number;
  totalCommission: {
    GLORY: number;
    SOL: number;
    USDC: number;
  };
  totalRevenue: {
    GLORY: number;
    SOL: number;
    USDC: number;
  };
  topSellers: Array<{
    sellerId: string;
    sellerName: string;
    totalSales: number;
    totalRevenue: number;
    currency: string;
  }>;
}

interface Transaction {
  id: string;
  buyer: {
    id: string;
    username: string;
  };
  seller: {
    id: string;
    username: string;
  };
  submission: {
    id: string;
    title: string;
  };
  price: number;
  sellerAmount: number;
  platformCommission: number;
  commissionRate: number;
  currency: string;
  createdAt: string;
}

export default function PromptSalesPage() {
  const { data: stats, isLoading: loadingStats } = useQuery<PromptSalesStats>({
    queryKey: ["/api/admin/prompt-sales/stats"],
  });

  const { data: transactions, isLoading: loadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/prompt-sales/transactions"],
  });

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "GLORY") {
      return `${Math.round(amount).toLocaleString()} GLORY`;
    }
    // Remove trailing zeros for decimal currencies
    const formatted = parseFloat(amount.toFixed(9)).toString();
    return `${formatted} ${currency}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prompt Sales & Commission</h1>
            <p className="text-muted-foreground">
              Track platform revenue from prompt marketplace commissions
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        {loadingStats ? (
          <div className="text-center py-8">Loading statistics...</div>
        ) : stats ? (
          <>
            {/* Total Sales Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSales}</div>
                <p className="text-xs text-muted-foreground">
                  Total prompt purchases across all currencies
                </p>
              </CardContent>
            </Card>

            {/* Commission Revenue Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* GLORY Commission */}
              {stats.totalCommission.GLORY > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">GLORY Commission</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(stats.totalCommission.GLORY).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total revenue: {Math.round(stats.totalRevenue.GLORY).toLocaleString()} GLORY
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* SOL Commission */}
              {stats.totalCommission.SOL > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">SOL Commission</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {parseFloat(stats.totalCommission.SOL.toFixed(9))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total revenue: {parseFloat(stats.totalRevenue.SOL.toFixed(9))} SOL
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* USDC Commission */}
              {stats.totalCommission.USDC > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">USDC Commission</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {parseFloat(stats.totalCommission.USDC.toFixed(9))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total revenue: {parseFloat(stats.totalRevenue.USDC.toFixed(9))} USDC
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Sellers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Sellers
                </CardTitle>
                <CardDescription>
                  Best performing prompt sellers by revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seller</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Currency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topSellers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No sales yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      stats.topSellers.map((seller, idx) => (
                        <TableRow key={`${seller.sellerId}-${seller.currency}`}>
                          <TableCell className="font-medium">{seller.sellerName}</TableCell>
                          <TableCell className="text-right">{seller.totalSales}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(seller.totalRevenue, seller.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                              {seller.currency}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest prompt purchases with commission details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : transactions && transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Prompt</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Seller Gets</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="font-medium">{tx.buyer.username}</TableCell>
                        <TableCell className="font-medium">{tx.seller.username}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={tx.submission.title}>
                          {tx.submission.title}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(tx.price, tx.currency)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(tx.sellerAmount, tx.currency)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-semibold">
                          {formatCurrency(tx.platformCommission, tx.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground">
                            {tx.commissionRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
