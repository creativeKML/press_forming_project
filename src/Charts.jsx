// src/Charts.jsx
import React from "react";
import { Box, SimpleGrid, Heading } from "@chakra-ui/react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, CartesianGrid, XAxis, YAxis, ResponsiveContainer
} from "recharts";

const pieData = [
  { name: "정상", value: 6034 },
  { name: "오산", value: 421 },
  { name: "찍힘", value: 604 },
  { name: "이물질", value: 496 },
  { name: "역삽", value: 836 },
  { name: "밀림", value: 941 },
  { name: "뒤틀림", value: 817 },
  { name: "도색불량", value: 417 },
];

const lineData = [
  { time: "15:31", rate: 0.9 },
  { time: "15:33", rate: 0.4 },
  { time: "15:35", rate: 0.1 },
  { time: "15:37", rate: 2.3 },
  { time: "15:39", rate: 1.1 },
  { time: "15:41", rate: 1.2 },
  { time: "15:43", rate: 1.8 },
  { time: "15:45", rate: 1.6 },
];

const COLORS = ["#6bd5ff","#ffd166","#ffa69e","#f4a261","#ef476f","#06d6a0","#bdb2ff","#c6f7e2"];

export default function Charts() {
  return (
    <Box p={4}>
      <Heading size="md" mb={4}>불량 비율 & 실시간 불량 모니터링</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <Box h="320px" bg="gray.800" p={3} borderRadius="lg">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        <Box h="320px" bg="gray.800" p={3} borderRadius="lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
