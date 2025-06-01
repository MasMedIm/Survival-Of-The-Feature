import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
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
import { fetchAnalytics } from '../services/analyticsService';
import { AnalyticsEvent } from '../types/analytics';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import webpage1 from '../assets/webpage1.jpeg';
import webpage2 from '../assets/webpage2.jpeg';
import webpage3 from '../assets/webpage3.jpeg';

interface VariantStats {
  variant: string;
  totalSessions: number;
  uniqueUsers: number;
  averageMaxDepth: number;
  medianMaxDepth: number;
  maxDepth: number;
  minMaxDepth: number;
  standardDeviation: number;
  engagementScore: number;
  returnRate: number;
}

const VariantAnalysis = () => {
  const [stats, setStats] = useState<VariantStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchAnalytics();
        const variantStats = analyzeVariants(response.items);
        setStats(variantStats);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('variant-preview-container');
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
      
      container.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };

  const analyzeVariants = (events: AnalyticsEvent[]): VariantStats[] => {
    const variantMap = new Map<string, AnalyticsEvent[]>();
    const userSessions = new Map<string, Set<string>>();
    const userReturnCount = new Map<string, number>();

    // Group events by variant
    events.forEach((event) => {
      if (!variantMap.has(event.variant)) {
        variantMap.set(event.variant, []);
      }
      variantMap.get(event.variant)!.push(event);

      // Track user sessions
      if (!userSessions.has(event.variant)) {
        userSessions.set(event.variant, new Set());
      }
      userSessions.get(event.variant)!.add(event.sessionId);

      // Track user returns
      const userKey = `${event.variant}-${event.sessionId}`;
      userReturnCount.set(userKey, (userReturnCount.get(userKey) || 0) + 1);
    });

    return Array.from(variantMap.entries()).map(([variant, events]) => {
      const maxDepths = events.map(e => e.maxDepth);
      const sortedMaxDepths = [...maxDepths].sort((a, b) => a - b);
      const median = sortedMaxDepths[Math.floor(sortedMaxDepths.length / 2)];
      
      // Calculate standard deviation
      const mean = maxDepths.reduce((a, b) => a + b, 0) / maxDepths.length;
      const squareDiffs = maxDepths.map(value => {
        const diff = value - mean;
        return diff * diff;
      });
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
      const stdDev = Math.sqrt(avgSquareDiff);

      // Calculate return rate
      const uniqueUsers = userSessions.get(variant)!.size;
      const returningUsers = Array.from(userReturnCount.entries())
        .filter(([key, count]) => key.startsWith(`${variant}-`) && count > 1)
        .length;
      const returnRate = (returningUsers / uniqueUsers) * 100;

      // Calculate engagement score (weighted combination of metrics)
      const engagementScore = (
        (mean / 100) * 0.4 + // Average depth (normalized)
        (returnRate / 100) * 0.3 + // Return rate
        (uniqueUsers / Math.max(...Array.from(userSessions.values()).map(s => s.size))) * 0.3 // Relative user base
      ) * 100;

      return {
        variant,
        totalSessions: events.length,
        uniqueUsers,
        averageMaxDepth: mean,
        medianMaxDepth: median,
        maxDepth: Math.max(...maxDepths),
        minMaxDepth: Math.min(...maxDepths),
        standardDeviation: stdDev,
        engagementScore,
        returnRate,
      };
    });
  };

  if (loading) {
    return <Typography>Loading analysis...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ flexGrow: 1 }}>
          Variant Performance Analysis
        </Typography>
        <button
          onClick={async () => {
            setLoading(true);
            try {
              const response = await fetchAnalytics();
              const variantStats = analyzeVariants(response.items);
              setStats(variantStats);
            } catch (error) {
              console.error('Error fetching data:', error);
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '1rem', borderRadius: 4, background: '#1976d2', color: '#fff', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Metrics Comparison
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Variant</TableCell>
                      <TableCell align="right">Total Sessions</TableCell>
                      <TableCell align="right">Unique Users</TableCell>
                      <TableCell align="right">Avg. Max Depth</TableCell>
                      <TableCell align="right">Median Depth</TableCell>
                      <TableCell align="right">Return Rate</TableCell>
                      <TableCell align="right">Engagement Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.map((stat) => (
                      <TableRow key={stat.variant}>
                        <TableCell>{stat.variant}</TableCell>
                        <TableCell align="right">{stat.totalSessions}</TableCell>
                        <TableCell align="right">{stat.uniqueUsers}</TableCell>
                        <TableCell align="right">{stat.averageMaxDepth.toFixed(1)}</TableCell>
                        <TableCell align="right">{stat.medianMaxDepth}</TableCell>
                        <TableCell align="right">{stat.returnRate.toFixed(1)}%</TableCell>
                        <TableCell align="right">{stat.engagementScore.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Engagement Score Comparison
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="variant" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="engagementScore" fill="#8884d8" name="Engagement Score" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Variant Previews
              </Typography>
              <Box sx={{ position: 'relative', height: 400 }}>
                <IconButton
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                  }}
                  onClick={() => handleScroll('left')}
                >
                  <ArrowBackIosNewIcon />
                </IconButton>
                <Box
                  id="variant-preview-container"
                  sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    scrollBehavior: 'smooth',
                    '&::-webkit-scrollbar': { display: 'none' },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    height: '100%',
                    gap: 2,
                    px: 1
                  }}
                >
                  <Box sx={{ flex: '0 0 auto', width: '32%', height: '100%', position: 'relative' }}>
                    <img
                      src={webpage1}
                      alt="Webpage 1 Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </Box>
                  <Box sx={{ flex: '0 0 auto', width: '32%', height: '100%', position: 'relative' }}>
                    <img
                      src={webpage2}
                      alt="Webpage 2 Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </Box>
                  <Box sx={{ flex: '0 0 auto', width: '32%', height: '100%', position: 'relative' }}>
                    <img
                      src={webpage3}
                      alt="Webpage 3 Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </Box>
                </Box>
                <IconButton
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
                  }}
                  onClick={() => handleScroll('right')}
                >
                  <ArrowForwardIosIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Analysis Summary
        </Typography>
        {stats.map((stat) => (
          <Card key={stat.variant} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {stat.variant}
              </Typography>
              <Typography variant="body1" paragraph>
                This variant shows {stat.engagementScore > 50 ? 'strong' : 'moderate'} engagement with an engagement score of {stat.engagementScore.toFixed(1)}.
                Users reach an average depth of {stat.averageMaxDepth.toFixed(1)} with a {stat.returnRate.toFixed(1)}% return rate.
                The standard deviation of {stat.standardDeviation.toFixed(1)} indicates {stat.standardDeviation > 20 ? 'high' : 'moderate'} variability in user engagement.
              </Typography>
              <Typography variant="body1">
                Recommendation: {stat.engagementScore > 50 ? 
                  'Consider this variant for broader deployment as it shows strong user engagement.' :
                  'This variant may need further optimization to improve user engagement.'}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default VariantAnalysis; 