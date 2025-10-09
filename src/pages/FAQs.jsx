import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Container } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Header from '../components/elements/Header.jsx';

const FAQs = () => {
    const faqData = [
        {
            question: "How do I use FAB Trades?",
            answer: "Simply search for cards you have in the 'Cards I Have' section and cards you want in the 'Cards I Want' section. The trade differential will automatically calculate to show if the trade is fair."
        },
        {
            question: "Where do the card prices come from?",
            answer: "Card prices are sourced from TCGCSV.com and are updated daily. The price you see is the market price on TCGPlayer, if there is no market price, we use the low price."
        },
        {
            question: "Can I save my trades?",
            answer: "Currently, trades are not saved between sessions. Each time you reload the page, you'll start with a fresh trade calculator. I am currently working on adding this feature."
        },
        {
            question: "What does the trade differential mean?",
            answer: "The trade differential shows the difference in value between the cards you're offering and the cards you want. A positive number means you're giving more value, a negative number means you're receiving more value."
        },
        {
            question: "Is there a Mobile App?",
            answer: "There is no mobile app currently, but never say never."
        },
        {
            question: "What if a card price seems wrong?",
            answer: "Prices are pulled directly from TCGPlayer market data. If a price seems incorrect, it may reflect actual market conditions or recent price movements."
        }
    ];

    return (
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f5f1ed 0%, #e8dfd6 100%)',
            backgroundAttachment: 'fixed'
        }}>
            <Header />
            
            <Container maxWidth="md" sx={{ py: 6, flexGrow: 1 }}>
                <Typography variant="h3" component="h1" gutterBottom sx={{ 
                    textAlign: 'center', 
                    mb: 6,
                    fontWeight: 800,
                    color: '#2c1810',
                    fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                    background: 'linear-gradient(135deg, #8b4513 0%, #5d2f0d 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    Frequently Asked Questions
                </Typography>

                <Box sx={{ mb: 6 }}>
                    {faqData.map((faq, index) => (
                        <Accordion 
                            key={index} 
                            sx={{ 
                                mb: 2,
                                borderRadius: '12px !important',
                                overflow: 'hidden',
                                border: '1px solid rgba(139, 69, 19, 0.15)',
                                boxShadow: '0 2px 8px rgba(139, 69, 19, 0.08)',
                                '&:before': {
                                    display: 'none'
                                },
                                '&:hover': {
                                    boxShadow: '0 4px 16px rgba(139, 69, 19, 0.12)',
                                },
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <AccordionSummary 
                                expandIcon={<ExpandMoreIcon sx={{ color: '#8b4513' }} />}
                                aria-controls={`panel${index}-content`}
                                id={`panel${index}-header`}
                                sx={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
                                    }
                                }}
                            >
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700,
                                    color: '#2c1810',
                                    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
                                }}>
                                    {faq.question}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ 
                                backgroundColor: '#ffffff',
                                pt: 2,
                                pb: 3
                            }}>
                                <Typography variant="body1" sx={{ 
                                    color: '#5d3a1a',
                                    lineHeight: 1.8,
                                    fontSize: { xs: '0.95rem', sm: '1rem' }
                                }}>
                                    {faq.answer}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>

                <Box sx={{ 
                    mt: 8, 
                    p: 4, 
                    background: 'linear-gradient(135deg, #ffffff 0%, #f5f1ed 100%)',
                    borderRadius: 3,
                    textAlign: 'center',
                    border: '2px solid rgba(139, 69, 19, 0.15)',
                    boxShadow: '0 4px 16px rgba(139, 69, 19, 0.1)'
                }}>
                    <Typography variant="h5" gutterBottom sx={{ 
                        fontWeight: 700,
                        color: '#2c1810',
                        mb: 2
                    }}>
                        Still have questions?
                    </Typography>
                    <Typography variant="body1" sx={{ 
                        color: '#5d3a1a',
                        lineHeight: 1.7
                    }}>
                        If you can't find the answer you're looking for, feel free to reach out to us for support at{' '}
                        <Box component="span" sx={{ 
                            color: '#8b4513',
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}>
                            fabtradesapp@gmail.com
                        </Box>
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default FAQs;
