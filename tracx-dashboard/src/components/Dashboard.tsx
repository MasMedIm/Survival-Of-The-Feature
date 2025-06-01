import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Container,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { fetchAnalytics, processAnalytics } from '../services/analyticsService';
import { VariantAnalytics } from '../types/analytics';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VariantAnalytics[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchAnalytics();
        const variantStats = processAnalytics(response.items);
        setStats(variantStats);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Variant Performance Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} md={4} key={stat.variant}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {stat.variant}
                </Typography>
                <Typography color="textSecondary">
                  Total Sessions: {stat.totalSessions}
                </Typography>
                <Typography color="textSecondary">
                  Unique Users: {stat.uniqueUsers}
                </Typography>
                <Typography color="textSecondary">
                  Average Max Depth: {stat.averageMaxDepth.toFixed(2)}
                </Typography>
                <Typography color="textSecondary">
                  Last Updated: {format(stat.lastUpdated, 'PPpp')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Average Max Depth by Variant
        </Typography>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="variant" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="averageMaxDepth" fill="#8884d8" name="Average Max Depth" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ mt: 4, height: 400 }}>
        <Typography variant="h6" gutterBottom>
          Unique Users by Variant
        </Typography>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="variant" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="uniqueUsers" fill="#82ca9d" name="Unique Users" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
};

export default Dashboard; 