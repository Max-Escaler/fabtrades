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
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            
            <Container maxWidth="md" sx={{ py: 4, flexGrow: 1 }}>
                <Typography variant="h3" component="h1" gutterBottom sx={{ 
                    textAlign: 'center', 
                    mb: 4,
                    fontWeight: 'bold'
                }}>
                    Frequently Asked Questions
                </Typography>

                <Box sx={{ mb: 4 }}>
                    {faqData.map((faq, index) => (
                        <Accordion key={index} sx={{ mb: 1 }}>
                            <AccordionSummary 
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls={`panel${index}-content`}
                                id={`panel${index}-header`}
                            >
                                <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                                    {faq.question}
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                    {faq.answer}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>

                <Box sx={{ 
                    mt: 6, 
                    p: 3, 
                    backgroundColor: 'grey.50', 
                    borderRadius: 2,
                    textAlign: 'center'
                }}>
                    <Typography variant="h6" gutterBottom>
                        Still have questions?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        If you can't find the answer you're looking for, feel free to reach out to us for support at fabtradesapp@gmail.com
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default FAQs;
