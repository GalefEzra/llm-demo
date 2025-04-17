import React, { useState, useRef } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  HStack,
  Heading,
  Textarea,
  Button,
  Text,
  Container,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  Progress,
  Badge,
  Tooltip,
  Flex,
  Spacer,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Popover,
  PopoverContent,
  PopoverBody,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';

interface TokenizedSentence {
  original: string;
  tokens: string[];
  token_ids: number[];
}

interface PredictionResult {
  context: string;
  probabilities: Record<string, number>;
  completed_sentence: string;
}

interface ProcessResponse {
  tokenized_sentences: TokenizedSentence[];
  one_word_predictions: PredictionResult[];
  two_word_predictions: PredictionResult[];
  three_word_predictions: PredictionResult[];
  four_word_predictions: PredictionResult[];
}

interface ContextOption {
  context: string;
  highlighted_words: string[];
  non_highlighted_words: string[];
}

interface ContextPrediction {
  word: string;
  probability: number;
}

interface ContextPredictionResponse {
  context_options: ContextOption[];
  predictions: ContextPrediction[];
}

const ContextDropdown = ({ nWords, options, selectedValue, onChange }: {
  nWords: number;
  options: ContextOption[];
  selectedValue?: string;
  onChange: (value: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const formattedOptions = options.map((option, idx) => ({
    key: `${idx}:${option.non_highlighted_words.join(' ')}:${option.highlighted_words.join(' ')}`,
    value: option.context,
    prefix: option.non_highlighted_words.join(' '),
    highlighted: option.highlighted_words.join(' ')
  }));

  const selectedOption = formattedOptions.find(opt => opt.value === selectedValue);

  return (
    <Box position="relative" width="100%">
      <Button
        ref={btnRef}
        onClick={() => setIsOpen(!isOpen)}
        width="100%"
        rightIcon={<ChevronDownIcon />}
        bg="white"
        borderWidth={1}
        textAlign="left"
        height="auto"
        py={2}
        display="flex"
        alignItems="center"
      >
        {selectedOption ? (
          <HStack spacing={2} flex={1}>
            {selectedOption.prefix && (
              <Text color="gray.600">{selectedOption.prefix}</Text>
            )}
            <Box
              bg="blue.100"
              px={2}
              py={1}
              borderRadius="md"
            >
              {selectedOption.highlighted}
            </Box>
          </HStack>
        ) : (
          "Select a context"
        )}
      </Button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        placement="bottom-start"
        initialFocusRef={btnRef}
        closeOnBlur={true}
      >
        <PopoverContent width="100%">
          <PopoverBody p={0}>
            <VStack align="stretch" spacing={0} maxH="300px" overflowY="auto">
              {formattedOptions.map(option => (
                <Button
                  key={option.key}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  variant="ghost"
                  justifyContent="flex-start"
                  width="100%"
                  height="auto"
                  py={2}
                  px={4}
                  whiteSpace="normal"
                  textAlign="left"
                  _hover={{ bg: 'gray.100' }}
                >
                  <HStack spacing={2}>
                    {option.prefix && (
                      <Text color="gray.600">{option.prefix}</Text>
                    )}
                    <Box
                      bg="blue.100"
                      px={2}
                      py={1}
                      borderRadius="md"
                    >
                      {option.highlighted}
                    </Box>
                  </HStack>
                </Button>
              ))}
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Box>
  );
};

function App() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ProcessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contextOptions, setContextOptions] = useState<{ [key: number]: ContextOption[] }>({});
  const [selectedContext, setSelectedContext] = useState<{ [key: number]: string }>({});
  const [contextPredictions, setContextPredictions] = useState<{ [key: number]: ContextPrediction[] }>({});
  const toast = useToast();
  
  // Create a map to store token-to-color assignments
  const [tokenColors] = useState(() => new Map<string, string>());
  
  // Pastel rainbow-like color schemes
  const colorSchemes = [
    "rgba(255, 250, 160, 0.3)",  // Light yellow
    "rgba(173, 216, 255, 0.3)",  // Light blue
    "rgba(144, 238, 144, 0.3)",  // Light green
    "rgba(255, 200, 180, 0.3)",  // Light peach
    "rgba(230, 190, 255, 0.3)",  // Light purple
    "rgba(175, 238, 238, 0.3)",  // Light cyan
    "rgba(255, 182, 193, 0.3)",  // Light pink
    "rgba(250, 250, 210, 0.3)",  // Light goldenrod
    "rgba(240, 255, 240, 0.3)",  // Honeydew
    "rgba(255, 228, 225, 0.3)"   // Misty rose
  ];

  // Function to get or assign a color for a token
  const getTokenColor = (token: string) => {
    // Use the exact token (preserving case) as the key
    if (!tokenColors.has(token)) {
      const nextColor = colorSchemes[tokenColors.size % colorSchemes.length];
      tokenColors.set(token, nextColor);
    }
    return tokenColors.get(token)!;
  };

  const fetchContextOptions = async (nWords: number) => {
    try {
      const response = await fetch(`http://localhost:8000/get_context_options/${nWords}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences: input.split('\n').filter(s => s.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch context options');
      }

      const data: ContextPredictionResponse = await response.json();
      console.log(`Received context options for ${nWords} words:`, data.context_options);
      
      setContextPredictions(prev => ({
        ...prev,
        [nWords]: data.predictions
      }));
      return data.context_options;
    } catch (error) {
      console.error(`Error fetching ${nWords}-word context options:`, error);
      toast({
        title: 'Error',
        description: 'Failed to fetch context options',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return [];
    }
  };

  const fetchPredictions = async (nWords: number, context: string) => {
    try {
      const response = await fetch(`http://localhost:8000/get_predictions/${nWords}?context=${encodeURIComponent(context)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences: input.split('\n').filter(s => s.trim())
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const data: ContextPrediction[] = await response.json();
      setContextPredictions(prev => ({
        ...prev,
        [nWords]: data
      }));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch predictions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleContextChange = async (nWords: number, context: string) => {
    try {
      setSelectedContext(prev => ({
        ...prev,
        [nWords]: context
      }));

      const response = await fetch(`http://localhost:8000/get_predictions/${nWords}?context=${encodeURIComponent(context)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences: input.split('\n').filter(s => s.trim())
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const data: ContextPrediction[] = await response.json();
      console.log(`Received predictions for ${nWords} words with context "${context}":`, data);
      
      setContextPredictions(prev => ({
        ...prev,
        [nWords]: data
      }));
    } catch (error) {
      console.error('Error fetching predictions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch predictions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      // Clear predictions on error
      setContextPredictions(prev => ({
        ...prev,
        [nWords]: []
      }));
    }
  };

  const renderContextSelector = (nWords: number, options: ContextOption[]) => {
    return (
      <VStack spacing={4} align="stretch" mb={6}>
        <Box p={4} bg="blue.50" borderRadius="md">
          <Text fontSize="lg" fontWeight="bold" mb={3}>
            How does this work?
          </Text>
          <UnorderedList spacing={2}>
            <ListItem>
              The model learns patterns from your input sentences, treating them as its training universe.
            </ListItem>
            <ListItem>
              It uses {nWords} {nWords === 1 ? 'word' : 'words'} as context to predict what word might come next.
            </ListItem>
            <ListItem>
              Each prediction comes with a probability based on how often that pattern appears in your sentences.
            </ListItem>
            <ListItem>
              The model can complete sentences by repeatedly predicting the next most likely word.
            </ListItem>
          </UnorderedList>
        </Box>

        <Text fontSize="lg" fontWeight="bold">
          Select Context ({nWords} {nWords === 1 ? 'word' : 'words'})
        </Text>
        <ContextDropdown
          nWords={nWords}
          options={options}
          selectedValue={selectedContext[nWords]}
          onChange={(value) => handleContextChange(nWords, value)}
        />
        <Text fontSize="sm" color="gray.600">
          {nWords === 1 ? (
            "Highlighted word is used for prediction"
          ) : (
            `${nWords} highlighted words are used for prediction`
          )}
        </Text>
      </VStack>
    );
  };

  // Custom component for displaying context options with highlighting
  const ContextOptionDisplay = ({ prefix, highlighted }: { prefix?: string, highlighted: string }) => {
    return (
      <HStack spacing={1} align="center">
        {prefix && (
          <Text color="gray.600">{prefix}</Text>
        )}
        <Box
          backgroundColor="blue.100"
          px={2}
          py={1}
          borderRadius="sm"
          display="inline-block"
        >
          {highlighted}
        </Box>
      </HStack>
    );
  };

  // Update the probability table to use the new highlighting
  const renderProbabilityTable = (nWords: number) => {
    const predictions = contextPredictions[nWords] || [];
    const selectedContextWords = selectedContext[nWords]?.split(' ') || [];
    
    // Split the context into non-highlighted and highlighted parts
    const highlightedWords = selectedContextWords.slice(-nWords);
    const prefixWords = selectedContextWords.slice(0, -nWords);
    
    return (
      <Box mb={6}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          Probability Table for Selected Context
        </Text>
        {selectedContextWords.length > 0 && (
          <Box mb={4}>
            <ContextOptionDisplay 
              prefix={prefixWords.length > 0 ? prefixWords.join(' ') : undefined}
              highlighted={highlightedWords.join(' ')}
            />
          </Box>
        )}
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Next Word</Th>
              <Th isNumeric>Probability</Th>
            </Tr>
          </Thead>
          <Tbody>
            {predictions && predictions.length > 0 ? (
              predictions
                .sort((a, b) => b.probability - a.probability)
                .map((prediction, idx) => (
                  <Tr key={idx}>
                    <Td fontWeight="medium">{prediction.word}</Td>
                    <Td isNumeric>{(prediction.probability * 100).toFixed(2)}%</Td>
                  </Tr>
                ))
            ) : (
              <Tr>
                <Td colSpan={2} textAlign="center">No predictions available</Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    );
  };

  const handleSubmit = async () => {
    if (!input.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some sentences',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setResults(null);
    setContextPredictions({});
    setSelectedContext({});
    setContextOptions({});
    tokenColors.clear();

    try {
      // Fetch context options for each n-gram size
      const [oneWordOpts, twoWordOpts, threeWordOpts, fourWordOpts] = await Promise.all([
        fetchContextOptions(1),
        fetchContextOptions(2),
        fetchContextOptions(3),
        fetchContextOptions(4)
      ]);

      // Store all context options
      setContextOptions({
        1: oneWordOpts,
        2: twoWordOpts,
        3: threeWordOpts,
        4: fourWordOpts
      });

      // Set initial selected contexts
      if (oneWordOpts.length > 0) setSelectedContext(prev => ({ ...prev, 1: oneWordOpts[0].context }));
      if (twoWordOpts.length > 0) setSelectedContext(prev => ({ ...prev, 2: twoWordOpts[0].context }));
      if (threeWordOpts.length > 0) setSelectedContext(prev => ({ ...prev, 3: threeWordOpts[0].context }));
      if (fourWordOpts.length > 0) setSelectedContext(prev => ({ ...prev, 4: fourWordOpts[0].context }));

      // Fetch initial predictions
      await Promise.all([
        oneWordOpts[0] && fetchPredictions(1, oneWordOpts[0].context),
        twoWordOpts[0] && fetchPredictions(2, twoWordOpts[0].context),
        threeWordOpts[0] && fetchPredictions(3, threeWordOpts[0].context),
        fourWordOpts[0] && fetchPredictions(4, fourWordOpts[0].context)
      ]);

      // Fetch the original results
      const response = await fetch('http://localhost:8000/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentences: input.split('\n').filter(s => s.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process sentences');
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process sentences',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTokenizedSentence = (sentence: TokenizedSentence) => (
    <Card key={sentence.original} mb={4}>
      <CardBody>
        <Text fontSize="lg" mb={2}>{sentence.original}</Text>
        <HStack spacing={1} wrap="wrap">
          {sentence.tokens.map((token, idx) => (
            <Tooltip 
              key={idx} 
              label={`Token ID: ${sentence.token_ids[idx]}`}
              placement="top"
              hasArrow
            >
              <Box 
                px={2}
                py={1}
                borderRadius="sm"
                color="gray.800"
                fontSize="md"
                fontFamily="system-ui, -apple-system, sans-serif"
                style={{
                  backgroundColor: getTokenColor(token),
                  display: 'inline-block',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'keep-all'
                }}
              >
                {token}
              </Box>
            </Tooltip>
          ))}
        </HStack>
      </CardBody>
    </Card>
  );

  const renderPrediction = (prediction: PredictionResult) => (
    <Card key={prediction.context} mb={4}>
      <CardBody>
        <Text fontSize="lg" mb={2}>
          Context: <Badge colorScheme="purple">{prediction.context}</Badge>
        </Text>
        <VStack align="stretch" spacing={2}>
          {Object.entries(prediction.probabilities)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([word, prob], idx) => (
              <Box key={idx}>
                <Flex mb={1}>
                  <Text>{word}</Text>
                  <Spacer />
                  <Text>{(prob * 100).toFixed(1)}%</Text>
                </Flex>
                <Progress value={prob * 100} size="sm" colorScheme="green" />
              </Box>
            ))}
        </VStack>
        <Text mt={4} color="gray.600">
          Most likely completion: {prediction.completed_sentence}
        </Text>
      </CardBody>
    </Card>
  );

  return (
    <ChakraProvider>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Heading as="h1" size="xl" textAlign="center" color="blue.600">
            LLM Sentence Completion Demo
          </Heading>

          <Card>
            <CardBody>
              <VStack spacing={4}>
                <Text fontSize="lg" fontWeight="bold">
                  Enter your sentences below (one per line)
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Try entering multiple sentences to see how the model processes and predicts text
                </Text>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Example: The cat sat on the mat."
                  size="lg"
                  rows={5}
                />
                <Button
                  colorScheme="blue"
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  size="lg"
                >
                  Analyze Sentences
                </Button>
              </VStack>
            </CardBody>
          </Card>

          {isLoading ? (
            <Box textAlign="center" py={10}>
              <Spinner size="xl" />
              <Text mt={4}>Processing your sentences...</Text>
            </Box>
          ) : results ? (
            <Tabs variant="enclosed" colorScheme="red">
              <TabList>
                <Tab>Tokenization</Tab>
                <Tab>1-Word Predictions</Tab>
                <Tab>2-Word Predictions</Tab>
                <Tab>3-Word Predictions</Tab>
                <Tab>4-Word Predictions</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <VStack spacing={4} align="stretch">
                    <Text fontSize="xl" fontWeight="bold" mb={4}>
                      How the sentences are broken down into tokens
                    </Text>
                    {results.tokenized_sentences.length > 0 ? (
                      results.tokenized_sentences.map(renderTokenizedSentence)
                    ) : (
                      <Alert status="info">
                        <AlertIcon />
                        No sentences to tokenize
                      </Alert>
                    )}
                  </VStack>
                </TabPanel>

                <TabPanel>
                  {contextOptions[1] && renderContextSelector(1, contextOptions[1])}
                  {renderProbabilityTable(1)}
                  <Text fontSize="xl" fontWeight="bold" mb={4}>
                    Predictions based on single word context
                  </Text>
                  {results.one_word_predictions.map(renderPrediction)}
                </TabPanel>

                <TabPanel>
                  {contextOptions[2] && renderContextSelector(2, contextOptions[2])}
                  {renderProbabilityTable(2)}
                  <Text fontSize="xl" fontWeight="bold" mb={4}>
                    Predictions based on two word context
                  </Text>
                  {results.two_word_predictions.map(renderPrediction)}
                </TabPanel>

                <TabPanel>
                  {contextOptions[3] && renderContextSelector(3, contextOptions[3])}
                  {renderProbabilityTable(3)}
                  <Text fontSize="xl" fontWeight="bold" mb={4}>
                    Predictions based on three word context
                  </Text>
                  {results.three_word_predictions.map(renderPrediction)}
                </TabPanel>

                <TabPanel>
                  {contextOptions[4] && renderContextSelector(4, contextOptions[4])}
                  {renderProbabilityTable(4)}
                  <Text fontSize="xl" fontWeight="bold" mb={4}>
                    Predictions based on four word context
                  </Text>
                  {results.four_word_predictions.map(renderPrediction)}
                </TabPanel>
              </TabPanels>
            </Tabs>
          ) : null}
        </VStack>
      </Container>
    </ChakraProvider>
  );
}

export default App; 